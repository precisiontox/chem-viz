function redirectToChemical(selectedChem) {
    if (selectedChem) {
        window.location.href = `/${encodeURIComponent(selectedChem)}`;
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
