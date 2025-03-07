function initializeNetworkAOP() {
    if (!document.getElementById("cy_aop").hasChildNodes()) {
        fetch(jsonAOP)
            .then(response => response.json())
            .then(elements => {
                var cy_aop = cytoscape({
                    container: document.getElementById("cy_aop"), // container to render in
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
                            selector: "node[role='aop-mie']",
                            style: {
                                "shape": "round-triangle",
                                "background-color": "#88D66C",
                                // "label": "data(label)"
                            }
                        },
                        {
                            selector: "node[role='aop-mie'].hl, node[role='aop-mie']:selected",
                            style: {
                                    "background-color": "#5b9b44",
                                    "label": "data(label)"
                                }
                        },
                        {
                            selector: "node[role='aop-ke']",
                            style: {
                                "shape": "round-diamond",
                                "background-color": "#987D9A"
                                // "label": "data(label)"
                            }
                        },
                        {
                            selector: "node[role='aop-ke'].hl, node[role='aop-ke']:selected",
                            style: {
                                    "background-color": "#5f3e61",
                                    "label": "data(label)"
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
                            selector: "node[role='chem'].hl, node[role='chem']:selected",
                            style: {
                                "background-color": "#3c5d51",
                                "label": "data(label)"
                            }
                        },
                        {
                            selector: "edge",
                            style: {
                                "width": 3,
                                "line-color": "#ccc"
                            }
                        },
                        {
                            selector: "edge.hl, edge:selected",
                            style: {
                                "label": "data(trigger)",
                                "line-color": "#B43F3F",
                                "z-index": "1"
                            }
                        }
                    ],
                    layout: {
                        name: 'cose',
                        fit: true,
                        animate: 'end',
                        nodeOverlap: 2000

                    },
                    hideEdgesOnViewport: true
                });

                // Add mouseover and mouseout events
                cy_aop.on('mouseover mouseout', 'node', function (event) {
                    var node = event.target;
                    node.toggleClass("hl");
                    node.connectedEdges().toggleClass("hl");
                    node.neighborhood().toggleClass("hl2");
                });

                cy_aop.on('mouseover mouseout', 'edge', function (event) {
                    var node = event.target;
                    node.toggleClass("hl");
                });

                cy_aop.nodes().qtip({
                    content: function() {
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
                        } else if (role === "aop-mie") {
                            var qtip_content =
                                "<div class='qtip-content'>\n" +
                                "<b>Molecular Initiating Event (AOP)</b><br>\n" +
                                "<b class='field'>AOP</b> | " + this.data("aop_id") + "<br>\n" +
                                "<b class='field'>Title</b> | " + this.data("aop_title") + "<br>\n" +
                                "</div>";
                        } else if (role === "aop-ke") {
                            var qtip_content =
                                "<div class='qtip-content'>\n" +
                                "<b>Key Event (AOP)</b><br>\n" +
                                "<b class='field'>AOP</b> | " + this.data("aop_id") + "<br>\n" +
                                "<b class='field'>Title</b> | " + this.data("aop_title") + "<br>\n" +
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
