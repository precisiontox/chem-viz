function populateChemSelect(basicNetworkLoaded = false) {
    const select = document.getElementById('chem-select');
    select.innerHTML = '<option value="">Select a compound...</option>';

    return new Promise((resolve, reject) => {
        if (basicNetworkLoaded) {
            const chemNodes = cy_graph.nodes("[role='chem']");
            chemNodes.forEach(node => {
                const option = document.createElement('option');
                option.value = node.id();
                option.textContent = node.data('label') || node.id();
                select.appendChild(option);
            });
            resolve();
        } else {
            fetch(jsonBasic)
                .then(response => response.json())
                .then(elements => {
                    const basicChemNodes = elements.filter(node => node.group === 'nodes' && node.data.role === 'chem');
                    basicChemNodes.forEach(node => {
                        const option = document.createElement('option');
                        option.value = node.data.id;
                        option.textContent = node.data.label || node.data.id;
                        select.appendChild(option);
                    });
                    resolve();
                })
                .catch(error => {
                    console.error('Error loading basic network for chem-select:', error);
                    reject(error);
                });
        }
    }).then(() => {
        // Initialize Select2 after options are populated
        $(select).select2({
            placeholder: "Type to search for a compound...",
            allowClear: true
        });
    });
}

function loadChemList() {
    if (!$.fn.DataTable.isDataTable('#chem-table')) {
        fetch('/get_chemicals')
            .then(response => response.json())
            .then(data => {
                const tableHeader = document.getElementById('chem-table-header');
                const tableBody = document.getElementById('chem-table-body');

                // Clear any existing content
                tableHeader.innerHTML = '';
                tableBody.innerHTML = '';

                // Create the table header
                if (data.length > 0) {
                    const headers = Object.keys(data[0]);
                    headers.forEach(header => {
                        const th = document.createElement('th');
                        th.textContent = header;
                        tableHeader.appendChild(th);
                    });
                }

                // Populate the table body
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    Object.entries(row).forEach(([key, value]) => {
                        const td = document.createElement('td');
                        // Check if this is the molecular formula column
                        if (key.toLowerCase() === "formula" || key.toLowerCase() === "molecular formula") {
                            td.innerHTML = formatMolecularFormula(value); // Use innerHTML for proper rendering
                        } else {
                            td.textContent = value; // Use textContent for other fields
                        }

                        tr.appendChild(td);
                    });
                    tableBody.appendChild(tr);
                });

                // Initialize DataTable
                const chem_table = $('#chem-table').DataTable({
                    dom: 'lBfrtip', // Enable buttons
                    buttons: [
                        'copy', 'csv', 'excel'
                    ],
                    scrollY: '65vh', // Vertical scrolling (adjust height as needed)
                    scrollX: true,   // Enable horizontal scrolling
                    scrollCollapse: true, // Allows the table to reduce in height when fewer rows are shown
                    paging: false,
                    columnDefs: [
                        { width: '150px', targets: '_all' } // Set the width for all columns
                    ],
                    drawCallback: function() { // Add tooltips after the table is drawn
                        $('#chem-table tbody td').each(function() {
                            // Destroy any existing tooltip instance to avoid duplicates
                            if ($(this).data('qtip')) $(this).qtip('destroy', true);

                            // Determine if this cell is in the rightmost column
                            let isRightmost = $(this).is(':last-child');

                            $(this).qtip({
                                content: {
                                    text: $(this).text().trim()
                                },
                                style: {
                                    classes: 'qtip-dark qtip-rounded'
                                },
                                position: {
                                    my: isRightmost ? 'top right' : 'top left',
                                    at: isRightmost ? 'bottom left' : 'bottom right'
                                }
                            });
                        });
                    }
                });
                let loaderTimeout;

                chem_table.on('order.dt', function () {
                    $('#loader').show();
                    loaderTimeout = setTimeout(() => {}, 200); // Start timer
                });

                chem_table.on('draw.dt', function () {
                    const hideLoader = () => $('#loader').hide();
                    if (loaderTimeout) {
                        clearTimeout(loaderTimeout);
                        setTimeout(hideLoader, 200); // Keep spinner for minimum time
                    } else {
                        hideLoader();
                    }
                }); 
            })
            .catch(error => console.error('Error loading chemical list:', error));
    }
}
