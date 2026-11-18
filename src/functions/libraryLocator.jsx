const libraryLocator = async (query) => {
  if (!query || !String(query).trim()) {
    return [];
  }

  return fetch(
    `https://locate.libbyapp.com/autocomplete/${encodeURIComponent(String(query).trim())}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Library locator request failed: ${response.status}`);
      }

      return response.json();
    })
    .then((payload) => {
      const branches = payload?.branches || payload;
      const groupedBySystemName = new Map();

      branches.forEach((branch) => {
        const systems = branch?.systems || [];

        systems.forEach((system) => {
          if (system?.name && system?.fulfillmentId) {
            const key = `${system.name}::${system.websiteId}`;

            if (!groupedBySystemName.has(key)) {
              groupedBySystemName.set(key, {
                name: system.name,
                websiteId: system.websiteId,
                libraryId: system.fulfillmentId,
              });
            }
          }
        });
      });

      return Array.from(groupedBySystemName.values());
    });
};

export default libraryLocator;
