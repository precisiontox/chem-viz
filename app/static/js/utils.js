function normalizeAppBasePath(path) {
    if (!path || path === '/') {
        return '';
    }
    return `/${path.replace(/^\/+|\/+$/g, '')}`;
}

function getAppBasePath() {
    const configuredBasePath = typeof appBasePath === 'undefined' ? '' : normalizeAppBasePath(appBasePath);
    if (configuredBasePath) {
        return configuredBasePath;
    }

    const firstPathSegment = window.location.pathname.split('/').filter(Boolean)[0];
    return firstPathSegment === 'chem' ? '/chem' : '';
}

function buildAppPath(path) {
    const relativePath = `/${path.replace(/^\/+/, '')}`;
    const basePath = getAppBasePath();
    if (basePath && (relativePath === basePath || relativePath.startsWith(`${basePath}/`))) {
        return relativePath;
    }
    return `${basePath}${relativePath}`;
}

function buildChemicalPath(ptxCode) {
    return buildAppPath(encodeURIComponent(ptxCode));
}

function redirectToChemical(selectedChem) {
    if (selectedChem) {
        window.location.href = buildChemicalPath(selectedChem);
    }
}

function formatMolecularFormula(formula) {
    // Ensure the input is a string before applying the regex
    if (typeof formula !== "string") {
        return formula; // Return as-is if it's not a string
    }
    
    // Use regex to wrap numbers in <sub> tags
    return formula.replace(/(\d+)/g, "<sub>$1</sub>");
}

function reLayout(network, layout_name) {
    let layout = network.layout(layout_name);
    layout.run();
}
