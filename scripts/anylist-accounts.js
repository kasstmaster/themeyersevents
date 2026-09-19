function clean(value) { return String(value ?? '').trim().replace(/\s+/g, ' '); }
function key(value) { return clean(value).toLocaleLowerCase('en-US'); }

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return [...value.values()];
  return value && typeof value === 'object' ? Object.values(value) : [];
}

function bySortIndex(left, right) {
  const leftSortIndex = left.value?.sortIndex ?? left.value?.manualSortIndex;
  const rightSortIndex = right.value?.sortIndex ?? right.value?.manualSortIndex;
  const leftIndex = Number.isFinite(leftSortIndex) ? leftSortIndex : Number.POSITIVE_INFINITY;
  const rightIndex = Number.isFinite(rightSortIndex) ? rightSortIndex : Number.POSITIVE_INFINITY;
  return leftIndex - rightIndex || left.index - right.index;
}

function sorted(values) {
  return asArray(values).map((value, index) => ({ value, index })).sort(bySortIndex).map(({ value }) => value);
}

function sortedItems(rawList) {
  const items = asArray(rawList?.items);
  if (rawList?.listItemSortOrder === 1) {
    return items.map((value, index) => ({ value, index })).sort((left, right) =>
      clean(left.value?.name).localeCompare(clean(right.value?.name), 'en-US', { sensitivity: 'base' }) || left.index - right.index
    ).map(({ value }) => value);
  }
  return sorted(items);
}

/**
 * Reconstruct category membership from the decoded protobuf data. The anylist
 * package's public List and Item wrappers intentionally omit these fields.
 */
export function categoriesFromRawUserData(userData, listId) {
  const shoppingLists = userData?.shoppingListsResponse;
  const rawList = [...asArray(shoppingLists?.newLists), ...asArray(shoppingLists?.modifiedLists)]
    .find(list => String(list?.identifier) === String(listId));
  if (!rawList) throw new Error(`Raw AnyList shopping list ${listId} was not found.`);

  const listResponse = asArray(shoppingLists?.listResponses)
    .find(response => String(response?.listId) === String(listId));
  if (!listResponse) throw new Error(`Raw AnyList category response for list ${listId} was not found.`);

  const groups = sorted(listResponse.categoryGroupResponses?.map(response => response?.categoryGroup).filter(Boolean));
  const categories = groups.flatMap(group => sorted(group.categories).map(category => ({
    id: category?.identifier,
    groupId: category?.categoryGroupId ?? group?.identifier,
    name: clean(category?.name),
    sortIndex: category?.sortIndex,
    items: []
  }))).filter(category => category.id != null && category.name);

  const categoryByAssignment = new Map(categories.map(category => [`${category.groupId ?? ''}\0${category.id}`, category]));
  const categoryById = new Map(categories.map(category => [String(category.id), category]));
  const rawItems = sortedItems(rawList);
  let unassigned = 0;
  for (const item of rawItems) {
    let assigned = false;
    for (const assignment of asArray(item?.categoryAssignments)) {
      const compositeKey = `${assignment?.categoryGroupId ?? ''}\0${assignment?.categoryId}`;
      const category = categoryByAssignment.get(compositeKey)
        ?? (assignment?.categoryGroupId == null ? categoryById.get(String(assignment?.categoryId)) : undefined);
      if (!category) continue;
      // Deliberately copy only the name; details is the user's private note field.
      category.items.push({ name: item?.name });
      assigned = true;
    }
    if (!assigned) unassigned += 1;
  }

  return { rawList, listResponse, groups, categories, unassigned };
}

export function categoryHouseholds(categoryName) {
  return clean(categoryName).split(/\s+-\s+/, 1)[0].split('/').map(clean).filter(Boolean);
}

export function convertCategory(categoryName, items) {
  const householdNames = categoryHouseholds(categoryName);
  const households = householdNames.map(lastName => ({ lastName, people: [] }));
  const skipped = [];
  for (const item of items) {
    // Deliberately read only the structured item name. notes/details are never candidates.
    const fullName = clean(item?.name);
    const matches = householdNames
      .map((lastName, index) => ({ lastName, index }))
      .filter(({ lastName }) => key(fullName).endsWith(` ${key(lastName)}`));
    if (matches.length !== 1) { skipped.push(fullName || '(unnamed item)'); continue; }
    const match = matches[0];
    const givenName = clean(fullName.slice(0, fullName.length - match.lastName.length));
    if (!givenName || /[,/]/.test(givenName)) { skipped.push(fullName); continue; }
    // Keep the person's spelling/capitalization rather than replacing it with the header hint.
    const displayedLastName = clean(fullName.slice(fullName.length - match.lastName.length));
    households[match.index].lastName = displayedLastName;
    households[match.index].people.push(givenName);
  }
  const populated = households.filter(household => household.people.length);
  return {
    account: populated.length ? populated.map(({ lastName, people }) => `${people.join(',')} ${lastName}`).join('/') : null,
    skipped
  };
}

export function normalizedAccountPeople(accountName) {
  const people = clean(accountName).split('/').flatMap(part => {
    const household = clean(part);
    const boundary = household.lastIndexOf(' ');
    if (boundary < 1) return [key(household)];
    const lastName = clean(household.slice(boundary + 1));
    return household.slice(0, boundary).split(',').map(first => key(`${clean(first)} ${lastName}`));
  }).filter(Boolean);
  return [...new Set(people)].sort().join('|');
}

export function addMissingAccounts(state, convertedAccounts) {
  const existing = new Set(state.accounts.map(account => normalizedAccountPeople(account.name)));
  const added = [];
  for (const name of convertedAccounts) {
    const normalized = normalizedAccountPeople(name);
    if (!normalized || existing.has(normalized)) continue;
    state.accounts.push({ name, selected: false });
    existing.add(normalized);
    added.push(name);
  }
  return added;
}
