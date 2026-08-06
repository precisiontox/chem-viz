let cy_graph;
let lastClickTime = 0;  // Store the time of the last click
let doubleClickDelay = 300;  // Maximum delay between clicks (in milliseconds)
let isSingleChemNetwork = false; // Tracks if a single chemical network is loaded
let categoryGridPositions = new Map(); // Original grid positions for visible category nodes
