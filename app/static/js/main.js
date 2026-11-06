function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");

    // Initialize the network only when the tab is activated
    if (tabName === 'network_view') {
        initializeCytoscape(selectedChemFromURL);
    } else if (tabName === 'chem_list') {
        loadChemList();
    }
}

function showTable(tableId) {
    // Hide tables
    document.querySelectorAll('.chem-table-container').forEach(table => {
        table.style.display = 'none';
    });

    // Remove 'active' class from buttons
    document.querySelectorAll('.table-tab-btn').forEach(button => {
        button.classList.remove('active');
    });

    // Show the selected table
    document.getElementById(tableId).style.display = 'block';

    // Add 'active' class to the clicked button
    document.querySelector(`.table-tab-btn[data-table-target="${tableId}"]`).classList.add('active');
}

function normalizePath(path) {
    return path.replace(/\/$/, '') || '/';
}

function resolveAppUrl(path) {
    return new URL(buildAppPath(path), window.location.origin);
}

function initializeTabs() {
    document.querySelectorAll('.tablinks').forEach(button => {
        button.addEventListener('click', function(event) {
            const targetUrl = this.dataset.tabUrl;
            if (targetUrl) {
                const tabUrl = resolveAppUrl(targetUrl);
                if (normalizePath(tabUrl.pathname) !== normalizePath(window.location.pathname)) {
                    window.location.href = tabUrl.href;
                    return;
                }
            }
            openTab(event, this.dataset.tabTarget);
        });
    });

    const selectedTab = selectedTabFromURL || 'network_view';
    const selectedButton = document.querySelector(`.tablinks[data-tab-target="${selectedTab}"]`);
    if (selectedButton) {
        openTab({ currentTarget: selectedButton }, selectedTab);
    }
}

function initializeTableTabs() {
    document.querySelectorAll('.table-tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            showTable(this.dataset.tableTarget);
        });
    });
}

function initializeClassificationButtons() {
    document.querySelectorAll('.classification-btn').forEach(button => {
        button.addEventListener('click', function() {
            loadBasicNetworkAndClassify(this.dataset.classification);
        });
    });
}

function initializeChemicalSelectControl() {
    $('#chem-select').on('change', function() {
        redirectToChemical(this.value);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeTableTabs();
    initializeClassificationButtons();
    initializeChemicalSelectControl();
    initializeNetworkControls();
    initializeDownloadControls();
    initializeGraphWheelScrolling();

    // Add event listener for the reset button
    document.getElementById('reset-button').addEventListener('click', resetNetwork);
});
