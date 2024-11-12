const generalNetworkStyle = [ // the stylesheet for general graph
    {
        selector: "node",
        style: {
            "border-width": "0px",
            "border-color": "#2C2C2C",
            "border-opacity": "1"
        }
    },
    {
        selector: "node.hl, node:selected",
        style: {
            "font-size": "25px",
            "font-weight": "bold",
            "border-width": "5px",
            "border-color": "#004880",
        }
    },
    {
        selector: "node.hl2",
        style: {
            "border-width": "5px",
            "border-color": "#004880",
        }
    },
    {
        selector: "node[role='chem']",
        style: {
            "shape": "ellipse",
            "width": "40px",
            "height": "40px",
            "background-color": "#f0f0f0",
            "border-width": "5px",
            "border-color": "#172d4a",
            "label": "data(name)",
            "color": "#172d4a",
            "font-weight": "bold"
        }
    },
    {
        selector: "node[role='chem'].hl, node[role='chem']:selected",
        style: {
            "background-color": "#9a999a",
            "border-color": "#004880",
            "color": "white", 
            "text-background-shape": "round-rectangle",
            "text-background-color": "#004880",
            "text-background-opacity": "1",
            // "label": "data(label)",
        }
    },
    {
        selector: "node[role='chem'].hl, node[role='chem']:selected",
        style: {
            "width": "45px",
            "height": "45px"
        }
    },
    {
        selector: "node[role='category_use_class']",
        style: {
            "shape": "round-rectangle"
        }
    },
    {
            selector: "node[role='category_tox_class']",
            style: {
                "shape": "round-rectangle"
            }
    },
    {
        selector: "edge",
        style: {
            "line-color": "data(color)"
        }
    },
    {
        selector: "edge[role='tox_class']",
        style: {
            "width": "mapData(score, -4, 10, 1, 10)",
        }
    },
    {
        selector: "edge.hl, edge:selected",
        style: {
            "line-color": "#004880",
            "z-index": "1"
        }
    },
    {
        selector: "node[role^='category']",
        style: {
            "width": "80px",
            "height": "80px",
            "background-color": "data(color_bg)", // Set node body color
            "background-opacity": "1",       // Adjust opacity if needed
            "border-width": "0px",
            "border-color": "data(color_border)",
            "border-opacity": "1",
            "background-image": function (ele) {
                return `${imageBaseUrl}${ele.data('image')}`;
            },
            "background-image-opacity": "1",
            "background-image-containment": "over",
            // "background-fit": "cover",         // Make the image cover the node
            "background-width": "120%",        // Extend beyond node width
            "background-height": "120%",       // Extend beyond node height
            "background-clip": "none",         // Allow image to go beyond node borders
            "bounds-expansion": "40px",         // Extend the image beyond node borders
            "font-size": "25px",
            "font-weight": "bold",
            "label": "data(label)",
            "color": "#000",
            "text-halign": "center",
            "text-valign": "bottom",
            "text-margin-y": "10px",
            "text-wrap": "wrap",
        }
    },
    {
        selector: "node[role^='category'].hl",
        style: {
            "width": "85px",
            "height": "85px",
            "font-size": "27px",
            "border-width": "5px",
            "border-color": "#004880",
            "color": "#004880"
        }
    },
    {
        selector: "node[role^='category']:selected",
        style: {
            "border-width": "5px",
            "border-color": "#004880",
            "color": "#004880"
        }
    }
];

const singleNetworkStyle = [
    {
        selector: "node[role='chem']",
        style: {
            "shape": "ellipse",
            "width": "50px",
            "height": "50px",
            "background-color": "#f0f0f0",
            "border-width": "5px",
            "border-color": "#172d4a",
            "label": "data(name)",
            "color": "#172d4a",
            "font-size": "20px",
            "font-weight": "bold",
            "text-valign": "center",
            "color": "white",
            "text-background-shape": "round-rectangle",
            "text-background-color": "#172d4a",
            "text-background-opacity": "1",
            "text-wrap": "wrap",
            "text-max-width": "200px"
        }
    },
    {
        selector: "node[role='chem'].hl, node[role='chem']:selected",
        style: {
            "width": "55px",
            "height": "55px",
            "font-size": "25px",
            "font-weight": "bold",
            "border-width": "5px",
            "border-color": "#004880",
            "background-color": "#9a999a",
            "border-color": "#004880",
            "color": "white", 
            "text-background-shape": "round-rectangle",
            "text-background-color": "#004880",
            "text-background-opacity": "1",
        }
    },
    {
        selector: "edge[role='attribute']",
        style: {
            "line-color": "#172d4a",
            "width": "10px"
        }
    },
    {
        selector: "edge[role='attribute'].hl, edge[role='attribute']:selected",
        style: {
            "line-color": "#004880",
            "width": "15px"
        }
    },
    {
        selector: "node[role='isolated-attribute']",
        style: {
            "shape": "data(shape)",
            "width": "80px",
            "height": "80px",
            "background-color": "#ddd",
            "border-width": "1px",
            "border-color": "#9a999a",
            "border-opacity": "0",
            "label": "data(label)",
            "color": "#9a999a",
            // "text-outline-width": "3px",
            // "text-outline-color": "#9a999a",
            "text-halign": "center",
            "text-valign": "center",
            "font-size": "20px",
            "font-weight": "bold",
            "text-wrap": "wrap"
        }
    },
    {
        selector: "node[role='isolated-attribute']:selected",
        style: {
            "border-color": "#004880",
            "border-opacity": "1"
        }
    },
    {
        selector: "node[role='attribute']",
        style: {
            "shape": "data(shape)",
            "width": "80px",
            "height": "80px",
            "background-color": "data(colorBg)",
            "border-width": "3px",
            "border-color": "data(colorBorder)",
            "border-opacity": "1",
            "label": "data(label)",
            "color": "white",
            "text-outline-width": "3px",
            "text-outline-color": "data(colorBorder)",
            "text-halign": "center",
            "text-valign": "center",
            "font-size": "20px",
            "font-weight": "bold",
            "text-wrap": "wrap"
        }
    },
    {
        selector: "node[role='attribute'].hl, node[role='attribute']:selected",
        style: {
            "width": "82px",
            "height": "82px",
            "font-size": "22px",
            "border-color": "#004880",
            "text-outline-color": "#004880",
        }
    },
    {
        selector: "node[role^='category']",
        style: {
            "width": "50px",
            "height": "50px",
            "shape": "data(shape)",
            "background-color": "data(colorBg)",
            "background-image": function (ele) {
                return `${imageBaseUrl}${ele.data('image')}`;
            },
            "background-image-opacity": "1",
            // "background-image-containment": "over",
            "background-fit": "cover",         // Make the image cover the node
            "background-width": "120%",        // Extend beyond node width
            "background-height": "120%",       // Extend beyond node height
            "background-clip": "none",         // Allow image to go beyond node borders
            "bounds-expansion": "40px", 
            "border-width": "1px",
            "border-color": "data(colorBorder)",
            "border-opacity": "0",
            "font-size": "18px",
            "font-weight": "bold",
            "label": "data(label)",
            "color": "#2c2e35",
            "text-halign": "center",
            "text-valign": "bottom",
            "text-wrap": "wrap"
        }
    },
    {
        selector: "node[role^='category'].hl, node[role^='category']:selected",
        style: {
            "width": "53px",
            "height": "53px",
            "font-size": "20px",
            "border-color": "#004880",
            "border-opacity": "1",
            "color": "#004880"
        }
    },
    {
        selector: "edge[role^='category']",
        style: {
            "line-color": "data(color)"
        }
    },
    {
        selector: "edge[role='tox_class']",
        style: {
            "width": "mapData(score, -4, 10, 1, 10)",
        }
    },
    {
        selector: "edge[role^='category'].hl, edge[role^='category']:selected",
        style: {
            "line-color": "#004880",
            "width": "5px"
        }
    },
    {
        selector: "node[role='prop']",
        style:{
            "shape": "data(shape)",
            "background-color": "data(colorBg)",
            "width": "50px",
            "height": "50px",
            "border-width": "1px",
            "border-color": "data(colorBorder)",
            "border-opacity": "0",
            "label": "data(combinedLabel)",
            "color": "#2c2e35",
            "font-size": "16px",
            "font-weight": "bold",
            "text-valign": "center",
            "text-wrap": "wrap" 
        }
    },
    {
        selector: "node[role='prop'].hl, node[role='prop']:selected",
        style:{
            "width": "53px",
            "height": "53px",
            "label": "data(hlLabel)",
            "font-size": "18px",
            "color": "#004880",
            "border-color": "#004880",
            "border-opacity": "1",
        }
    },
    {
        selector: "edge[role='prop']",
        style: {
            "line-color": "data(color)"
        }
    },
    {
        selector: "node[role='base_tox']",
        style:{
            "shape": "data(shape)",
            "background-color": "data(colorBg)",
            "width": "50px",
            "height": "50px",
            "border-width": "1px",
            "border-color": "data(colorBorder)",
            "border-opacity": "0",
            "label": "data(label)",
            "color": "#2c2e35",
            "font-size": "16px",
            "font-weight": "bold",
            "text-valign": "center",
            "text-wrap": "wrap" 
        }
    },
    {
        selector: "node[role='base_tox'].hl, node[role='base_tox']:selected",
        style:{
            "width": "52px",
            "height": "52px",
            "color": "#004880",
            "font-size": "18px",
            "border-color": "#004880",
            "border-opacity": "1",
        }
    },
    {
        selector: "edge[role='base_tox']",
        style: {
            "line-color": "data(color)"
        }
    },
    {
        selector: "node[role='moa']",
        style: {
            "shape": "data(shape)",
            "background-color": "data(colorBg)",
            "width": "50px",
            "height": "50px",
            "border-width": "1px",
            "border-color": "data(colorBorder)",
            "border-opacity": "0",
            "label": "data(label)",
            "font-size": "16px",
            "color": "#2c2e35",
            "text-valign": "center",
            "text-wrap": "wrap" 
        }
    },
    {
        selector: "node[role='moa'].hl",
        style: {
            "width": "52px",
            "height": "52px",
            "color": "#004880",
            "border-color": "#004880",
            "border-opacity": "1",
            "label": "data(fullLabel)",
            "font-size": "18px",
            "text-background-color": "white",
            "text-background-opacity": "0.5",
            "text-justification": "left"
        }
    },
    {
        selector: "node[role='moa']:selected",
        style: {
            "width": "52px",
            "height": "52px",
            "color": "#004880",
            "border-color": "#004880",
            "border-opacity": "1"
        }
    },
    {
        selector: "edge[role='moa'], edge[role='aop'], edge[role='target']",
        style: {
            "line-color": "data(color)"
        }
    },
    {
        selector: "node[role='target'], node[role='aop']",
        style: {
            "shape": "data(shape)",
            "width": "50px",
            "height": "50px",
            "background-color": "data(colorBg)",
            "border-width": "1px",
            "border-color": "data(colorBorder)",
            "border-opacity": "0",
            "label": "data(id)",
            "font-size": "16px",
            "color": "#2c2e35",
            "text-valign": "center",
            "text-wrap": "wrap",
            "text-max-width": "150px"
        }
    },
    {
        selector: "node[role='target'].hl, node[role='aop'].hl",
        style: {
            "width": "52px",
            "height": "52px",
            "color": "#004880",
            "border-color": "#004880",
            "border-opacity": "1",
            "font-size": "18px",
            "font-weight": "bold",
            "text-max-width": "175px",
            "text-background-color": "white",
            "text-background-opacity": "0.5"
        }
    }
];