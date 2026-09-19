import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMissingAccounts, accountPeople, categoriesFromRawUserData, convertCategory,
  normalizedPerson, syncAnyListAccounts
} from '../scripts/anylist-accounts.js';

test('converts three households in category order and ignores notes', () => {
  const result = convertCategory('SYSWERDA / HEIL / STEGALL - 2897 Panzl St, Muskegon MI 49444', [
    { name: 'Eric Syswerda' }, { name: 'Vandy Syswerda' }, { name: 'Danielle Syswerda' },
    { name: 'Ian Heil' }, { name: 'Lexi Heil', notes: 'Sheridan' }, { name: 'Vanden Stegall' }
  ]);
  assert.equal(result.account, 'Eric,Vandy,Danielle Syswerda/Ian,Lexi Heil/Vanden Stegall');
  assert.doesNotMatch(result.account, /Sheridan/);
});

test('ignores a note and category address', () => {
  const result = convertCategory('SYLVESTRE / BENJAMIN - PO Box 89, 39 Heidt Place, Dillon SK', [
    { name: 'Buddy Sylvestre' }, { name: 'Deandra Benjamin', notes: 'Briette' }
  ]);
  assert.equal(result.account, 'Buddy Sylvestre/Deandra Benjamin');
  assert.doesNotMatch(result.account, /Briette|PO Box/);
});

test('converts one-person household', () => assert.equal(convertCategory('RAUDMAN', [{ name: 'Buddy Raudman' }]).account, 'Buddy Raudman'));

test('normalized people prevent spacing and case duplicates', () => {
  const state = { accounts: [{ name: 'Josh,Julie,Aiden Wickendoll', selected: false }] };
  assert.deepEqual(addMissingAccounts(state, [' josh, Julie, Aiden  WICKENDOLL ']), []);
  assert.equal(state.accounts.length, 1);
});

test('duplicate leaves enabled existing record untouched', () => {
  const original = { name: 'Josh,Julie,Aiden Wickendoll', selected: true, extra: 'preserved' };
  const state = { accounts: [original] };
  assert.deepEqual(addMissingAccounts(state, ['Josh, Julie, Aiden Wickendoll']), []);
  assert.strictEqual(state.accounts[0], original);
  assert.equal(state.accounts[0].selected, true);
});

test('ambiguous items are skipped rather than guessed', () => {
  const result = convertCategory('SMITH / JONES', [{ name: 'Prince' }, { name: 'Alex Smith' }]);
  assert.equal(result.account, 'Alex Smith');
  assert.deepEqual(result.skipped, ['Prince']);
});

test('reconstructs ordered categories and item membership from raw AnyList data', () => {
  const userData = {
    shoppingListsResponse: {
      newLists: [{
        identifier: 'address-book-id',
        name: 'Address Book',
        items: [
          { name: 'Second Smith', details: 'private note', manualSortIndex: 20, categoryAssignments: [{ categoryGroupId: 'people', categoryId: 'smith' }] },
          { name: 'Nobody Jones', manualSortIndex: 15, categoryAssignments: [] },
          { name: 'First Smith', manualSortIndex: 10, categoryAssignments: [{ categoryGroupId: 'people', categoryId: 'smith' }] },
          { name: 'Amy Adams', manualSortIndex: 5, categoryAssignments: [{ categoryGroupId: 'people', categoryId: 'adams' }] }
        ]
      }],
      listResponses: [{
        listId: 'address-book-id',
        categoryGroupResponses: [{ categoryGroup: {
          identifier: 'people',
          categories: [
            { identifier: 'smith', categoryGroupId: 'people', name: 'SMITH - Main St', sortIndex: 20 },
            { identifier: 'adams', categoryGroupId: 'people', name: 'ADAMS', sortIndex: 10 }
          ]
        } }]
      }]
    }
  };

  const result = categoriesFromRawUserData(userData, 'address-book-id');
  assert.deepEqual(result.categories.map(category => category.name), ['ADAMS', 'SMITH - Main St']);
  assert.deepEqual(result.categories[1].items, [{ name: 'First Smith' }, { name: 'Second Smith' }]);
  assert.equal(result.unassigned, 1);
  assert.doesNotMatch(JSON.stringify(result.categories), /private note/);
});

test('matches a category assignment only on the requested raw list', () => {
  const userData = {
    shoppingListsResponse: {
      newLists: [
        { identifier: 'other', items: [{ name: 'Wrong Smith', categoryAssignments: [{ categoryGroupId: 'group', categoryId: 'cat' }] }] },
        { identifier: 'target', items: [{ name: 'Right Smith', categoryAssignments: [{ categoryGroupId: 'group', categoryId: 'cat' }] }] }
      ],
      listResponses: [{ listId: 'target', categoryGroupResponses: [{ categoryGroup: {
        identifier: 'group', categories: [{ identifier: 'cat', name: 'SMITH' }]
      } }] }]
    }
  };

  const result = categoriesFromRawUserData(userData, 'target');
  assert.deepEqual(result.categories[0].items, [{ name: 'Right Smith' }]);
});

function category(id, names, heading = 'HALL') {
  const converted = convertCategory(heading, names.map(name => ({ name })));
  return { id, ...converted };
}

test('person removed updates the linked record and preserves selected', () => {
  const state = { accounts: [{ name: 'Ben Hall IV,Sherri Hall', selected: true, anyListCategoryId: 'hall-123', anyListAnchor: 'Ben Hall IV' }], events: {} };
  const result = syncAnyListAccounts(state, [category('hall-123', ['Ben Hall IV'])]);
  assert.deepEqual(result.added, []);
  assert.equal(state.accounts.length, 1);
  assert.equal(state.accounts[0].name, 'Ben Hall IV');
  assert.equal(state.accounts[0].selected, true);
});

test('person added updates the same linked record', () => {
  const state = { accounts: [{ name: 'Ben Hall IV,Sherri Hall', selected: false, anyListCategoryId: 'hall-123' }], events: {} };
  syncAnyListAccounts(state, [category('hall-123', ['Ben Hall IV', 'Sherri Hall', 'Katie Hall'])]);
  assert.equal(state.accounts.length, 1);
  assert.deepEqual(accountPeople(state.accounts[0].name), ['Ben Hall IV', 'Sherri Hall', 'Katie Hall']);
});

test('Roman numeral suffix is part of legacy anchor identity', () => {
  const state = { accounts: [{ name: 'Ben Hall V', selected: true }, { name: 'Ben Hall IV', selected: false }], events: {} };
  syncAnyListAccounts(state, [category('hall-123', ['Ben Hall IV', 'Sherri Hall'])]);
  assert.equal(state.accounts[0].anyListCategoryId, undefined);
  assert.equal(state.accounts[1].anyListCategoryId, 'hall-123');
  assert.deepEqual(accountPeople(state.accounts[1].name), ['Ben Hall IV', 'Sherri Hall']);
});

test('Jr and Sr suffixes are distinct', () => {
  assert.notEqual(normalizedPerson('Robert Smith Jr.'), normalizedPerson('Robert Smith Sr.'));
});

test('suffix punctuation is insignificant', () => {
  assert.equal(normalizedPerson('Robert Smith Jr'), normalizedPerson('Robert Smith Jr.'));
});

test('renaming during sync migrates every RSVP and claim without losing quantities', () => {
  const state = {
    accounts: [{ name: 'Ben Hall IV,Sherri Hall', selected: true, anyListCategoryId: 'hall-123' }],
    events: {
      thanksgiving: { rsvps: [{ name: 'Ben Hall IV,Sherri Hall', adults: 2, children: 1 }], items: [{ claims: ['Ben Hall IV,Sherri Hall', 'Ben Hall IV,Sherri Hall', 'Other'] }] },
      christmas: { rsvps: [{ name: 'Ben Hall IV,Sherri Hall', adults: 1, children: 0 }], items: [{ claims: ['Ben Hall IV,Sherri Hall'] }] }
    }
  };
  syncAnyListAccounts(state, [category('hall-123', ['Ben Hall IV'])]);
  assert.deepEqual(state.events.thanksgiving.rsvps, [{ name: 'Ben Hall IV', adults: 2, children: 1 }]);
  assert.deepEqual(state.events.thanksgiving.items[0].claims, ['Ben Hall IV', 'Ben Hall IV', 'Other']);
  assert.equal(state.events.christmas.rsvps[0].name, 'Ben Hall IV');
  assert.deepEqual(state.events.christmas.items[0].claims, ['Ben Hall IV']);
});

test('category ID wins when the prior anchor was removed', () => {
  const state = { accounts: [{ name: 'Ben Hall IV,Sherri Hall', selected: true, anyListCategoryId: 'hall-123', anyListAnchor: 'Ben Hall IV' }], events: {} };
  syncAnyListAccounts(state, [category('hall-123', ['Sherri Hall'])]);
  assert.equal(state.accounts.length, 1);
  assert.equal(state.accounts[0].name, 'Sherri Hall');
  assert.equal(state.accounts[0].anyListAnchor, 'Sherri Hall');
  assert.equal(state.accounts[0].selected, true);
});
