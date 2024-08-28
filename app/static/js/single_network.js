function initializeNetworkSingle() {

    if (!document.getElementById('cy_single').hasChildNodes()) {

        fetch(jsonSingle)
            .then(response => response.json())
            .then(elements => {
                var cy_single = cytoscape({
                    container: document.getElementById('cy_single'), // container to render in
                    elements: elements,
                    style: [ // the stylesheet for the graph
                                                {
                            selector: "node",
                            style: {
                                "width": "40px",
                                "height": "40px",
                                "border-width": "0.5px",
                                "border-color": "#2C2C2C",
                                "border-opacity": "1",
                            }
                        },
                        {
                            selector: "node.hl",
                            style: {
                                "font-size": "25px",
                                "font-weight": "bold",
                                "border-width": "5px",
                                "border-color": "#B43F3F",
                            }
                        },
                                                {
                            selector: "node.hl2",
                            style: {
                                "border-width": "5px",
                                "border-color": "#B43F3F",
                            }
                        },
                        {
                            selector: "node[role='chem']",
                            style: {
                                "background-color": "#73BBA3",
                                "label": "data(ptx_code)"
                            }
                        },
                        {
                            selector: "node[role='chem'].hl, node[role='chem'].hl2, node[role='chem']:selected",
                            style: {
                                "background-color": "#3c5d51",
                                "label": "data(label)"
                            }
                        },
                        {
                            selector: "node[role='drugbank']",
                            style: {
                                "background-color": "#dd009c",
                                "label": "data(id)"
                            }
                        },
                        {
                            selector: "node[role='drugbank'].hl",
                            style: {
                                "background-color": "#dd009c",
                                "label": "data(chem_target)"
                            }
                        },
                        {
                            selector: "edge[role='drugbank']",
                            style: {
                                "width": 3,
                                "line-color": "#dd009c",
                                "label": "data(chem_effect)"
                            }
                        },
                        {
                            selector: "edge.hl, edge:selected",
                            style: {
                                "z-index": "1",
                                "font-size": "25px",
                                "line-color": "#B43F3F"
                            }
                        }
                    ],
                    layout: {
                        name: 'cose',
                        fit: true
                    }
                });

                // Add mouseover and mouseout events
                cy_single.on('mouseover mouseout', 'node', function (event) {
                    var node = event.target;
                    node.toggleClass("hl");
                    // node.connectedEdges().toggleClass("hl");
                    // node.neighborhood().toggleClass("hl2");
                });

                cy_single.on('mouseover mouseout', 'edge', function (event) {
                    var edge = event.target;
                    edge.toggleClass("hl");
                    edge.connectedNodes().toggleClass("hl");
                });

                cy_single.nodes().qtip({
                    content: function () {
                        var role = this.data("role")
                        if (role === "chem") {
                            var qtip_content =
                                "<div class='qtip-content'>\n" +
                                "<b class='field compound'>Compound</b><b>  | " + this.data("name") + "</b> <br>\n" +
                                "<b class='field ptx_code'>PTX Code</b> | " + this.data("ptx_code") + "<br>\n" +
                                "<b class='field cas_number'>CAS Number</b> | " + this.data("cas") + "<br>\n" +
                                "<b class='field dsstox_id'>DSSTox ID</b> | " + this.data("dtxsid") + "<br>\n" +
                                "<b class='field drugbank_id'>DrugBank AN</b> | <a href='https://go.drugbank.com/drugs/"+this.data("db_id")+"'>"+ this.data("db_id") + "<a><br>\n" +
                                "<b class='field smiles'>SMILES</b> | " + this.data("smiles") + "<br>\n" +
                                "<b class='field inchi'>InChIKey</b> | " + this.data("inchi") + "<br>\n" +
                                "</div>";
                        } else if (role === "drugbank") {
                            var qtip_content =
                                "<div class='qtip-content'>\n" +
                                "<b class='field drugbank'>DRUGBANK</b><br>\n" +
                                "<b class='field drugbank'>Accession</b> | <a href='https://go.drugbank.com/drugs/"+this.data("drugbank_id")+"'>"+ this.data("drugbank_id") + "<a><br>\n" +
                                "<b class='field drugbank'>Chemical Target</b> | " + this.data("chem_target") + "<br>\n" +
                                "<b class='field drugbank'>Chemical Effect at Target</b> | " + this.data("chem_effect") + "<br>\n" +
                                "<b class='field drugbank'>Organism</b> | " + this.data("organism") + "<br>\n" +
                                "<b class='field drugbank'>Known?</b> | " + this.data("known_action") + "<br>\n" +
                                "<b class='field drugbank'>Toxicity</b> | " + this.data("toxicity") + "<br>\n" +
                                "</div>";
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

            })
            .catch(error => console.error('Error loading elements:', error));
    }
}
