// Basic Network Functions

function setResetButtonHighlighted(isHighlighted) {
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.classList.toggle('reset-tool-active', isHighlighted);
    }
}

function markNetworkChanged() {
    setResetButtonHighlighted(true);
}

function initializeCytoscape(selectedChem = null) {
    if (selectedChem) {
        populateChemSelect().then(() => {
            document.getElementById('chem-select').value = selectedChem;
            loadSingleChemNetwork(selectedChem);
            // document.getElementById('chem-select').dispatchEvent(new Event('change'));
        });
    } else {
        initializeNetworkBasic();
    }
}

// Basic Network Functions

function initializeNetworkBasic() {
    if (!document.getElementById('cy_graph').hasChildNodes()) {
        fetch(jsonBasic)
            .then(response => response.json())
            .then(elements => {
                cy_graph = cytoscape({
                    container: document.getElementById('cy_graph'),
                    elements: elements,
                    style: generalNetworkStyle,
                    zoomingEnabled: true,
                    userZoomingEnabled: false, 
                    wheelSensitivity: 0.5
                    // layout: cose_layout
                });
                initializeBasicNetworkFeatures();
                selectClassification(true, 'use');
                setResetButtonHighlighted(false);
                populateChemSelect(basicNetworkloaded=true);
            })
            .catch(error => console.error('Error loading elements:', error));
    }
}

function positionUnopenedCategoryNodesOutsideOccupiedGraph(occupiedElements, categoryNodes) {
    const count = categoryNodes.length;
    if (count === 0) {
        return;
    }

    const bbox = occupiedElements.boundingBox({ includeLabels: true });
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const spacingX = 220;
    const spacingY = 160;
    const marginY = 180;
    const centerX = (bbox.x1 + bbox.x2) / 2;
    const startX = centerX - ((columns - 1) * spacingX) / 2;
    const startY = bbox.y1 - marginY - ((rows - 1) * spacingY);

    categoryNodes.forEach((node, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        node.position({
            x: startX + col * spacingX,
            y: startY + row * spacingY
        });
    });
}

function getUnopenedVisibleCategoryNodes(excludedCategoryNode) {
    return cy_graph.nodes(":visible[role^='category']").not(excludedCategoryNode).filter(node => {
        return node.connectedEdges(":visible").length === 0;
    });
}

function saveCategoryGridPositions(categoryNodes) {
    categoryGridPositions.clear();
    categoryNodes.forEach(node => {
        categoryGridPositions.set(node.id(), { ...node.position() });
    });
}

function restoreCategoryGridPosition(categoryNode) {
    const originalPosition = categoryGridPositions.get(categoryNode.id());
    if (originalPosition) {
        categoryNode.position(originalPosition);
    }
}

function arrangeUnopenedCategoriesAfterToggle() {
    const visibleCategoryNodes = cy_graph.nodes(":visible[role^='category']");
    const unopenedCategoryNodes = visibleCategoryNodes.filter(node => {
        return node.connectedEdges(":visible").length === 0;
    });
    const occupiedElements = cy_graph.elements(':visible').not(unopenedCategoryNodes);

    if (occupiedElements.length > 0) {
        positionUnopenedCategoryNodesOutsideOccupiedGraph(occupiedElements, unopenedCategoryNodes);
    } else {
        visibleCategoryNodes.forEach(node => restoreCategoryGridPosition(node));
    }
}

function boxesOverlap(firstBox, secondBox, padding = 80) {
    return !(
        firstBox.x2 + padding < secondBox.x1 ||
        firstBox.x1 - padding > secondBox.x2 ||
        firstBox.y2 + padding < secondBox.y1 ||
        firstBox.y1 - padding > secondBox.y2
    );
}

function getVisibleChemicalCategoryNeighbors(chemNode) {
    return chemNode.connectedEdges(":visible").connectedNodes().filter("[role^='category']");
}

function getCategoryColor(categoryNode) {
    return categoryNode.data('color_bg') || categoryNode.data('color_border') || categoryNode.data('color') || '#111111';
}

function clearChemicalPieData() {
    cy_graph.nodes("[role='chem']").forEach(chemNode => {
        for (let index = 1; index <= 8; index++) {
            chemNode.data(`category_color_${index}`, '#f0f0f0');
            chemNode.data(`category_slice_${index}`, 0);
        }
    });
}

function setChemicalPieData(chemNode, categoryNodes) {
    const maxSlices = 8;
    const sliceSize = 100 / categoryNodes.length;

    categoryNodes.slice(0, maxSlices).forEach((categoryNode, index) => {
        chemNode.data(`category_color_${index + 1}`, getCategoryColor(categoryNode));
        chemNode.data(`category_slice_${index + 1}`, sliceSize);
    });
}

function updateChemicalPieColors() {
    clearChemicalPieData();

    cy_graph.nodes("[role='chem']").forEach(chemNode => {
        const visibleCategoryEdges = chemNode.connectedEdges(":visible").filter(edge => {
            const visibleCategoryNodes = edge.connectedNodes().filter(connectedNode => {
                const role = connectedNode.data('role') || '';
                return connectedNode.visible() && role.startsWith('category');
            });
            return visibleCategoryNodes.length > 0;
        });
        const visibleCategoryNodes = visibleCategoryEdges.connectedNodes().filter(connectedNode => {
            const role = connectedNode.data('role') || '';
            return connectedNode.visible() && role.startsWith('category');
        });

        if (visibleCategoryNodes.length > 0) {
            setChemicalPieData(chemNode, visibleCategoryNodes);
        }
    });
}

function moveNodesBy(nodes, dx, dy) {
    nodes.forEach(node => {
        const position = node.position();
        node.position({
            x: position.x + dx,
            y: position.y + dy
        });
    });
}

function separateActiveOpenCluster(categoryNode) {
    const connectedEdges = categoryNode.connectedEdges(":visible");
    const chemNodes = connectedEdges.targets().add(connectedEdges.sources()).filter("[role='chem']");
    const movableChemNodes = chemNodes.filter(node => {
        return getVisibleChemicalCategoryNeighbors(node).length <= 1;
    });
    const movableNodes = categoryNode.union(movableChemNodes);
    const sharedChemNodes = chemNodes.not(movableChemNodes);
    const openCategoryNodes = cy_graph.nodes(":visible[role^='category']").filter(node => {
        return node.id() !== categoryNode.id() && node.connectedEdges(":visible").length > 0;
    });

    if (openCategoryNodes.length === 0) {
        return;
    }

    const occupiedNodes = openCategoryNodes.union(
        openCategoryNodes.connectedEdges(":visible").connectedNodes().filter("[role='chem']")
    ).not(movableNodes).not(sharedChemNodes);

    if (occupiedNodes.length === 0) {
        return;
    }

    const originalBox = movableNodes.boundingBox({ includeLabels: true });
    const occupiedBox = occupiedNodes.boundingBox({ includeLabels: true });

    if (!boxesOverlap(originalBox, occupiedBox)) {
        return;
    }

    const stepX = Math.max(originalBox.w, 240) + 180;
    const stepY = Math.max(originalBox.h, 180) + 160;
    const candidateOffsets = [
        { x: stepX, y: 0 },
        { x: -stepX, y: 0 },
        { x: 0, y: stepY },
        { x: 0, y: -stepY },
        { x: stepX, y: stepY },
        { x: -stepX, y: stepY },
        { x: stepX, y: -stepY },
        { x: -stepX, y: -stepY },
        { x: stepX * 2, y: 0 },
        { x: -stepX * 2, y: 0 },
        { x: 0, y: stepY * 2 }
    ];

    const freeOffset = candidateOffsets.find(offset => {
        const candidateBox = {
            x1: originalBox.x1 + offset.x,
            x2: originalBox.x2 + offset.x,
            y1: originalBox.y1 + offset.y,
            y2: originalBox.y2 + offset.y
        };
        return !boxesOverlap(candidateBox, occupiedBox);
    }) || { x: stepX, y: stepY };

    moveNodesBy(movableNodes, freeOffset.x, freeOffset.y);
}

function initializeBasicNetworkFeatures() {
    commonNetworkFeatures()

    cy_graph.on('click', "node[role^='category']", function(event) {
        let categoryNode = event.target;
        toggleChemNodes(categoryNode);
        displayCategoryChemicals(categoryNode);
    });

    cy_graph.edges().qtip({
        content: function () {
            let chemNode = this.target();
            let chemName = chemNode.data("name");
            if (this.data("role") === "tox_class") {
                var qtip_content =
                `<div class='qtip-content'><br>
                    <b class='field-edge-tox'>Toxicity class</b> | <span style='color:${this.data("color")}; font-weight: bold'>${this.data("source")}</span><br>
                    <b class='field-edge-tox'>Compound</b> | [${this.data("target")}] ${chemName} <br>
                    <b class='field-edge-tox'>Score</b> | ${this.data("score")} <br>
                    <b class='field-edge-tox'># references</b> | ${this.data("n_refs")} <br>
                </div>`;
            } else if (this.data("role") === "use_class") {
                var qtip_content =
                `<div class='qtip-container'>
                    <div class='qtip-row'>
                        <div class='qtip-label'>Use class</div>
                        <div class='qtip-value'><span style='color:${this.data("color")}; font-weight: bold'> ${this.data("source")}</span></div>
                    </div>
                    <div class='qtip-row'> 
                        <div class='qtip-label'>Compound</div> 
                        <div class='qtip-value'>[${this.data("target")}] ${chemName}</div>
                    </div>
                </div>`;
            }
            return qtip_content
        },
        position: {
            my: "top center",
            at: "bottom center"
        },
        style: {
            classes: "qtip-bootstrap qtip-wide",
            tip: {
                width: 20,
                height: 10
            }
        },
        show: {
            event: "click"
        },
        hide: {
            event: 'unfocus'
        }
    });

       // Apply qTip tooltip to isolated attribute nodes
       cy_graph.nodes("[role^='category']").qtip({
        content: {
            text: function () {
                return `${this.data('chem_number')} chemicals associated to this category.<br>Click to display/hide.`;
            }
        },
        position: {
            my: 'top center',
            at: 'bottom center'
        },
        style: {
            classes: 'qtip-dark qtip-rounded',
            tip: {
                width: 8,
                height: 4
            }
        },
        show: {
            event: 'mouseover'
        },
        hide: {
            event: 'mouseout'
        }
    });
}

function commonNetworkFeatures() {
    // Add mouseover and mouseout events
    cy_graph.on('mouseover mouseout', 'node', function (event) {
        var node = event.target;
        node.toggleClass("hl");
        node.connectedEdges().toggleClass("hl");
        node.neighborhood().toggleClass("hl2");
    });

    cy_graph.on('mouseover mouseout', 'edge', function (event) {
        var edge = event.target;
        edge.toggleClass("hl");
        edge.connectedNodes().toggleClass("hl");
    });

    cy_graph.nodes("node[role='chem']").qtip({
        content: function () {
            if (this.data("db_id")==="NA") {
                var drugbank = "<b class='field'>DrugBank AN</b> | N/A<br>\n";
            } else {
                var drugbank = "<b class='field'>DrugBank AN</b> | <a href='https://go.drugbank.com/drugs/" + this.data("db_id") + "' target='_blank' rel='noopener noreferrer'>" + this.data("db_id") + "</a><br>\n";
            }
            if (this.data("mw_g_mol")==="NA") {
                var mw = "<b class='field prop'>Molecular Weight</b> | N/A<br>\n";
            } else {
                var mw = "<b class='field prop'>Molecular Weight</b> | "+this.data("mw_g_mol")+" g/mol<br>\n"
            }
            if (this.data("solubility_h2o_mol_liter")==="NA") {
                var solubility = "<b class='field prop'>Solubility (H2O)</b> | N/A<br>\n";
            } else {
                var solubility = "<b class='field prop'>Solubility (H2O)</b> | "+this.data("solubility_h2o_mol_liter")+" mol/liter (source:"+this.data("source_solubility_h2o")+")<br>\n"
            }
            if (this.data("henry_coefficient_atm_m3_mol")==="NA") {
                var henry = "<b class='field prop'>Henry Coefficient</b> | N/A<br>\n";
            } else {
                var henry = "<b class='field prop'>Henry Coefficient</b> | "+this.data("henry_coefficient_atm_m3_mol")+" atm*m3/mol (source:"+this.data("source_henry")+")<br>\n"
            }
            if (this.data("log_kaw_kh_rt")==="NA") {
                var log_kaw = "<b class='field prop'>Log Kaw</b> | N/A<br>\n";
            } else {
                var log_kaw = "<b class='field prop'>Log Kaw</b> | "+this.data("log_kaw_kh_rt")+" (source: "+this.data("source_kaw")+")<br>\n"
            }
            if (this.data("log_kow_liter_liter")==="NA") {
                var log_kow = "<b class='field prop'>Log Kow</b> | N/A<br>\n";
            } else {
                var log_kow = "<b class='field prop'>Log Kow</b> | "+this.data("log_kow_liter_liter")+" (source: "+this.data("source_kow")+")<br>\n"
            }
            if (this.data("pka_acid")==="NA") {
                var pka_acid = "<b class='field prop'>pKa (acid)</b> | N/A<br>\n";
            } else {
                var pka_acid = "<b class='field prop'>pKa (acid)</b> | "+this.data("pka_acid")+" (source: "+this.data("source_pka")+")<br>\n"
            }
            if (this.data("pka_base")==="NA") {
                var pka_base = "<b class='field prop'>pKa (base)</b> | N/A<br>\n";
            } else {
                var pka_base = "<b class='field prop'>pKa (base)</b> | "+this.data("pka_base")+" (source: "+this.data("source_pka")+")<br>\n"
            }
            if (this.data("log_dlipw_ph74_liter_liter")==="NA") {
                var dlipw = "<b class='field prop'>Log Dlipw (pH 7.4)</b> | N/A<br>\n";
            } else {
                var dlipw = "<b class='field prop'>Log Dlipw (pH 7.4)</b> | "+this.data("log_dlipw_ph74_liter_liter")+" (source: "+this.data("source_dlipw")+")<br>\n"
            }
            if (this.data("freely_dissolved_fraction")==="NA") {
                var fdf = "<b class='field prop'>Freely Dissolved Fraction</b> | N/A<br>\n";
            } else {
                var fdf = "<b class='field prop'>Freely Dissolved Fraction</b> | "+this.data("freely_dissolved_fraction")+"<br>\n"
            }
            if (this.data("density_kg_liter")==="NA") {
                var density = "<b class='field prop'>Density</b> | N/A<br>\n";
            } else {
                var density = "<b class='field prop'>Density</b> | "+this.data("density_kg_liter")+" kg/liter (source:"+this.data("source_density")+")<br>\n"
            }
            var qtip_content =
                "<div class='qtip-content' style='max-height: 200px; overflow-y: auto; position: relative;'>" +
                
                "<div style='position: absolute; top: 5px; right: 5px;'>" +
                "<a href='" + buildChemicalPath(this.data("ptx_code")) + "' target='_blank' rel='noopener noreferrer' style='display: inline-flex; align-items: center; background-color: #054a81; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 12px;'>" +
                "<i class='fas fa-search-plus' style='margin-right: 4px;'></i>Go to chemical" +
                "</a></div>" +

                "<b class='field'>Compound</b><b>  | " + this.data("name") + "</b> <br>\n" +
                "<b class='field'>PTX Code</b> | " + this.data("ptx_code") + "<br>\n" +
                "<b class='field'>CAS Number</b> | " + this.data("cas") + "<br>\n" +
                "<b class='field'>DSSTox ID</b> | <a href='https://comptox.epa.gov/dashboard/chemical/details/"+this.data("dtxsid")+"' target='_blank' rel='noopener noreferrer'>"+this.data("dtxsid") + "</a><br>\n" +
                "<b class='field'>PubChem CID</b> | <a href='https://pubchem.ncbi.nlm.nih.gov/compound/"+this.data("cid")+"' target='_blank' rel='noopener noreferrer'>"+this.data("cid") + "</a><br>\n" +
                drugbank+
                "<b class='field'>Molecular Formula</b> | " + formatMolecularFormula(this.data("formula")) + "<br>\n" +
                "<b class='field'>SMILES</b> | " + this.data("smiles") + "<br>\n" +
                "<b class='field'>InChIKey</b> | " + this.data("inchi") + "<br>\n" +
                // mw + solubility + henry + log_kaw + log_kow + pka_acid + pka_base + dlipw + fdf + density +
                "</div><br>";
            return qtip_content
        },
        position: {
            my: "top center",
            at: "bottom center"
        },
        style: {
            classes: "qtip-bootstrap qtip-wide",
            tip: {
                width: 50,
                height: 10
            }
        },
        show: {
            event: "click"
        },
        hide: {
            event: 'unfocus'
        }
    });
};

function selectClassification(first_time=false, selectedClass=null) {
    // let selectedClass = document.getElementById('category-select').value;
    let selectedNodes = cy_graph.nodes("[role^='category_" + selectedClass + "']");
    
    if (first_time) {
        cy_graph.elements().hide();
        selectedNodes.show();
        reLayout(selectedNodes, initial_layout);
        saveCategoryGridPositions(selectedNodes);
        cy_graph.fit(selectedNodes);

    } else {
        // Get the connected edges and neighbor nodes
        let connectedEdges = selectedNodes.connectedEdges();
        let neighborNodes = connectedEdges.targets().add(connectedEdges.sources());

        // Hide non-displayed elements
        cy_graph.elements().hide();
        selectedNodes.show();
        connectedEdges.show();
        neighborNodes.show();

        // Re-layout and fit view
        reLayout(selectedNodes.union(connectedEdges).union(neighborNodes), cose_layout);
        cy_graph.fit(selectedNodes.union(connectedEdges).union(neighborNodes));
    }
}

function loadBasicNetworkAndClassify(classificationType, showResetButton=true) {
    // Load the basic network JSON file
    fetch(jsonBasic)
        .then(response => response.json())
        .then(elements => {
            // Destroy the current single chemical network
            if (cy_graph) {
                cy_graph.destroy();
            }

            // Initialize Cytoscape with the full basic network
            cy_graph = cytoscape({
                container: document.getElementById('cy_graph'),
                elements: elements,
                style: generalNetworkStyle,
                zoomingEnabled: true,
                userZoomingEnabled: false, 
                wheelSensitivity: 0.5,
                layout: initial_layout  // Adjust layout as needed
            });

            // Initialize interactions for the basic network
            initializeBasicNetworkFeatures();

            // Call selectClassification based on the passed classification type
            selectClassification(true, classificationType);

            isSingleChemNetwork = false;
            setResetButtonHighlighted(showResetButton);
        })
        .catch(error => console.error('Error loading basic network:', error));

    // Update button active state
    document.querySelectorAll('.classification-btn').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(`${classificationType}-button`).classList.add('active');
    document.getElementById('chem-info-section').style.display = 'none';
}

function toggleChemNodes(categoryNode) {
    // Get all connected chemical nodes and edges
    const connectedEdges = categoryNode.connectedEdges();
    const chemNodes = connectedEdges.targets().add(connectedEdges.sources()).filter("[role='chem']");

    // Determine if we should hide or show chem nodes
    const isAlreadyVisible = connectedEdges.every(edge => edge.visible());
    if (isAlreadyVisible) {
        // Hide all edges for the category node
        connectedEdges.hide();
        // Hide chem nodes that are only connected to it
        const chemNodesWithNoVisibleEdges = cy_graph.nodes("[role='chem']").filter(node => {
            // Check if the node has no visible connected edges
            return node.connectedEdges(":visible").length === 0;
        });
        chemNodesWithNoVisibleEdges.hide();
        categoryNode.removeClass('category-open');
        arrangeUnopenedCategoriesAfterToggle();
        updateChemicalPieColors();
        cy_graph.fit(cy_graph.elements(':visible'), 20);
        markNetworkChanged();
    } else {
        // Show all connected edges and chem nodes
        connectedEdges.show();
        updateChemicalPieColors();
        chemNodes.show();
        categoryNode.addClass('category-open');

        const activeElements = categoryNode.union(chemNodes).union(connectedEdges);

        const layout = activeElements.layout({
            name: 'cose',
            fit: true,
            padding: 20,
            nodeRepulsion: 10000,
            nodeOverlap: 700,
            nodeDimensionsIncludeLabels: false
        });

        layout.one('layoutstop', function() {
            separateActiveOpenCluster(categoryNode);
            const unopenedCategoryNodes = getUnopenedVisibleCategoryNodes(categoryNode);
            const occupiedElements = cy_graph.elements(':visible').not(unopenedCategoryNodes);
            positionUnopenedCategoryNodesOutsideOccupiedGraph(occupiedElements, unopenedCategoryNodes);
            updateChemicalPieColors();
            cy_graph.fit(cy_graph.elements(':visible'), 20);
            markNetworkChanged();
        });
        layout.run();
    }
}


// Single Chemical Network Functions

function loadSingleChemNetwork(selectedChem) {
    document.getElementById('change_label_size_container').style.display = 'none';

    // If no node is selected, reset the network
    if (!selectedChem) {
        selectClassification(true, 'use');
        return;
    }

    // Fetch the smaller network JSON file for the selected chemical.
    const jsonUrl = jsonBasic.replace(
        /elements\/basic\.json$/,
        `elements/single_chem/${encodeURIComponent(selectedChem)}_network.json`
    );
    fetch(jsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load single chemical network: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(chemNetworkElements => {
            // Destroy the previous network  to clean up memory
            if (cy_graph) {
                cy_graph.destroy();
            }
      
            // Initialize the single chemical network
            cy_graph = cytoscape({
                container: document.getElementById('cy_graph'),
                elements: chemNetworkElements,
                style: singleNetworkStyle,
                zoomingEnabled: true,
                userZoomingEnabled: false, 
                wheelSensitivity: 0.5,
                layout: circle_layout
            });

            cy_graph.ready(() => {
                // Display only chemical and attribute nodes
                let selectedNode = cy_graph.nodes("[role='chem']");
                let connectedEdges = selectedNode.connectedEdges();
                let neighborNodes = connectedEdges.targets().add(connectedEdges.sources());
                let selectedElements = selectedNode.union(connectedEdges).union(neighborNodes);
                cy_graph.elements().hide();
                selectedElements.show();
                reLayout(selectedElements, cose_layout);
                cy_graph.fit(selectedElements);
                
                // Initialize interactivity features
                initializeSingleChemNetworkFeatures();
            });
            displayChemicalInfo(selectedChem);
            isSingleChemNetwork = true;
        })
        .catch(error => {
            console.error(
                `Error loading single chemical network ${selectedChem}_network.json:`, 
                error
            );
        });

    // 'Deactivate' classification buttons
    document.querySelectorAll('.classification-btn').forEach(
        btn => btn.classList.remove('active')
    );
}

function initializeSingleChemNetworkFeatures() {
    commonNetworkFeatures();    
    updateIsolatedAttributes();

    // Add click event to attribute nodes
    cy_graph.on('click', "node[role='attribute']", function(event) {
        let selectedNode = event.target;
        let connectedEdges = selectedNode.connectedEdges().filter("[subrole='attribute']");
        let neighborNodes = connectedEdges.targets();
        let selectedElements = connectedEdges.union(neighborNodes);
    
        // Check if the neighbor nodes are visible
        let areVisible = neighborNodes.first().style('display') !== 'none';
    
        if (areVisible) {
            // If they are visible, hide them
            selectedElements.hide();
        } else {
            // If they are hidden, show them
            selectedElements.show();
            reLayout(cy_graph.elements(), cose_layout);
            // let main = cy_graph.nodes("[role='chem']").union( cy_graph.nodes("[role='category']") );
            // main.layout(circle_layout)
            // neighborNodes.layout(circle_layout).run();
            cy_graph.fit(cy_graph.elements());
        }
        markNetworkChanged();
    });

    // Apply qTip tooltip to attribute nodes
    cy_graph.nodes("[role='attribute']").qtip({
        content: {
            text: 'Click to display/hide information.'
        },
        position: {
            my: 'top center',
            at: 'bottom center'
        },
        style: {
            classes: 'qtip-dark qtip-rounded',
            tip: {
                width: 8,
                height: 4
            }
        },
        show: {
            event: 'mouseover'
        },
        hide: {
            event: 'mouseout'
        }
    }); 
}

function updateIsolatedAttributes() {
    // Loop through each node with role "attribute"
    cy_graph.nodes("[role='attribute']").forEach(function(node) {
        // Find edges that source from this node
        const outgoingEdges = node.outgoers('edge');

        // Check if there are no outgoing edges
        if (outgoingEdges.length === 0) {
            // Change the role to 'isolated-attribute' if no outgoing edges
            node.data('role', 'isolated-attribute');
        } else {
            // Revert to 'attribute' role if there are outgoing edges
            node.data('role', 'attribute');
        }
    });

    // Apply qTip tooltip to isolated attribute nodes
    cy_graph.nodes("[role='isolated-attribute']").qtip({
        content: {
            text: 'No information available.'
        },
        position: {
            my: 'top center',
            at: 'bottom center'
        },
        style: {
            classes: 'qtip-dark qtip-rounded',
            tip: {
                width: 8,
                height: 4
            }
        },
        show: {
            event: 'mouseover'
        },
        hide: {
            event: 'mouseout'
        }
    });   
}

function changeLabelFontSize(fontSize) {
    if (!isSingleChemNetwork) {
        cy_graph.style().selector('node[role="chem"]').style('font-size', fontSize + 'px').update();
    }  
}

function changeChemNodeLabel(){
    let selectedLabel = document.getElementById('chem-node-label-select').value;
    let selectedLabel2 = 'data(' + selectedLabel + ')';
    cy_graph.style().selector('node[role="chem"]').style('label', selectedLabel2).update();
}

function resetNetwork() {
    if (isSingleChemNetwork) {
        // Reset for single chemical network
        const selectedChem = document.getElementById('chem-select').value;
        if (selectedChem) {
            loadSingleChemNetwork(selectedChem); // Reload with the currently selected chemical
        }
    } else {
        // Reset for basic network
        const activeButton = document.querySelector('.classification-btn.active');
        if (activeButton) {
            const classificationType = activeButton.id.includes('use') ? 'use' : 'tox';
            loadBasicNetworkAndClassify(classificationType, false);
        }
    }
    setResetButtonHighlighted(false);
}

function initializeNetworkControls() {
    document.getElementById('label-font-size-slider').addEventListener('input', function() {
        changeLabelFontSize(this.value);
        markNetworkChanged();
    });

    // BUTTON: Center the graph on the page
    $("#center").click(function () {
        cy_graph.fit(cy_graph.$("node:visible"));
    });

    // BUTTON: Lock/Unlock element positions
    $("#lock").click(function () {
        if (cy_graph.autolock() == false) {
            cy_graph.autolock(true);
            $("#lock i").toggleClass("fa-unlock fa-lock");
        } else if (cy_graph.autolock() == true) {
            cy_graph.autolock(false);
            $("#lock i").toggleClass("fa-lock fa-unlock");
        }
    });

    // BUTTON: Zoom-In / Zoom-Out
    $("#zoom-in").click(function () {
        var z = cy_graph.zoom() + 0.1;
        cy_graph.zoom(z);
    });
    $("#zoom-out").click(function () {
        var z = cy_graph.zoom() - 0.1;
        cy_graph.zoom(z);
    });

    $('#mouse-wheel-zoom').click(function () {
        // Get the current zooming state
        let isZoomingEnabled = cy_graph.userZoomingEnabled();
        
        // Toggle the state
        cy_graph.userZoomingEnabled(!isZoomingEnabled);

        // Update button text based on the new state
        if (isZoomingEnabled){
            $('#mouse-wheel-zoom i').toggleClass("bx-mouse bxs-mouse");
        } else {
            $('#mouse-wheel-zoom i').toggleClass("bxs-mouse bx-mouse");
        }
    });
}

function initializeDownloadControls() {
    /// DOWNLOAD BUTTONS
    $("#dl-btn").click(function () {
        if (this.className == "dl-btn-off") {
            this.className = "dl-btn-on";
            $("#dl-content").css("display", "flex");
        } else {
            this.className = "dl-btn-off";
            $("#dl-content").css("display", "none");
        }
    });

    // BUTTON: Get snapshot as PNG
    $("#dl_png").click(function () {
        var image = cy_graph.png()
        var iframe = "<iframe src='" + image + `' frameborder='0'
            style='border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;'
            allowfullscreen></iframe>`;
        var win = window.open();
        win.document.write(iframe);
    });
    // BUTTON: Get snapshot as JPG
    $("#dl_jpg").click(function () {
        var image = cy_graph.jpg()
        var iframe = "<iframe src='" + image + `' frameborder='0'
            style='border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;'
            allowfullscreen></iframe>`;
        var win = window.open();
        win.document.write(iframe);
    });
    // BUTTON: Get snapshot as SVG
    $("#dl_svg").click(function (filename) {
        var svgContent = cy_graph.svg({scale: 1, full: true});
        var blob = new Blob([svgContent], {type: "image/svg+xml;charset=utf-8"});
        saveAs(blob, "graph.svg");
    });
}

function initializeGraphWheelScrolling() {
    document.getElementById('cy_graph').addEventListener('wheel', function(event) {
        if (!event.ctrlKey && !event.metaKey) {  
            // Stop Cytoscape from hijacking the scroll event
            event.stopPropagation();
            
            // Allow normal page scrolling
            window.scrollBy({
                top: event.deltaY,
                behavior: 'auto' 
            });
        }
    }, { passive: false });
}
