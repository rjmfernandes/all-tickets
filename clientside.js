let tickets = new Map();
let orgId = null;
let ticketsLength = 0;
let newWindow;
const subdomains = getSubDomains(document.URL);
const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
const startURL = subdomains.join('');
let fromDate = new Date(0);
let allButton = null;
let months3Button = null;
let months6Button = null;
let infoMessage = null;
const selectedStyle = "background: #000000;color: #ffffff;padding: 0.5rem 1rem;border-radius: 0.5rem;" +
    "cursor: hand;font-family: Arial, Helvetica, sans-serif;font-size: 14px;margin: 10px;";
const unselectedStyle = "background: #A5D6A7;color: #ffffff;padding: 0.5rem 1rem;border-radius: 0.5rem;" +
    "cursor: hand;font-family: Arial, Helvetica, sans-serif;font-size: 14px;margin: 10px;";
let totalSize = 0;

function getTicket(ticketId, ticketDate, callback) {
    fetch(`${startURL}/tickets/${ticketId}/print`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'X-CSRF-Token': token
        }
    }).then(function(responseTicket) {
        infoToWindow(`Ticket details ${ticketId}`);
        responseTicket.text().then(function(html) {
            tickets.set(ticketDate, html);
            if (callback) {
                callback();
            }
        });
    }).catch(function(error) {
        console.error('Error fetching ticket:', error);
    });
}

function getTickets(orgId, callback) {
    infoToWindow('FETCHING...');
    if (tickets.size === 0) {
        fetch(`${startURL}/api/v2/views/preview.json?_include_archive=true&per_page=300&page=1`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token
            },
            body: JSON.stringify({
                view: {
                    all: [{
                        field: 'organization',
                        operator: 'is',
                        value: orgId
                    }],
                    output: {
                        columns: ["status", "id", "subject", "requester", "created", "updated", "group", "assignee"],
                        group_by: "status",
                        group_order: "asc",
                        sort_by: "updated",
                        sort_order: "desc"
                    }
                }
            })
        }).then(function(response) {
            response.clone().json().then(function(json) {
                const ticketRows = json.rows;
                ticketsLength = ticketRows.length;
                infoToWindow(`Tickets length ${ticketsLength}`);
                for (let i = 0; i < ticketRows.length; i++) {
                    const ticketId = ticketRows[i].ticket.id;
                    const ticketDate = new Date(ticketRows[i].created);
                    getTicket(ticketId, ticketDate, callback);
                }
            });
        }).catch(function(error) {
            console.error('Error fetching tickets:', error);
        });
    } else {
        printTicketsIfComplete();
    }
}

function setLabel(id, innerHtml, onclickFunction) {
    const labelNode = newWindow.document.body.appendChild(document.createElement('label'));
    labelNode.id = id;
    labelNode.innerHTML = innerHtml;
    labelNode.style = unselectedStyle;
    labelNode.onclick = onclickFunction;
    return labelNode;
}

function setupBody() {
    newWindow.document.body.innerHTML = '';
    allButton = setLabel('all', 'All Tickets', getAll);
    months3Button = setLabel('3months', 'Last 3 months', get3Months);
    months6Button = setLabel('6months', 'Last 6 months', get6Months);
    infoMessage = newWindow.document.body.appendChild(document.createElement('div'));
    infoMessage.style = 'margin: 10px;';
}

function printToWindow(msg) {
    newWindow.document.body.insertAdjacentHTML("beforeend", msg);
}

function infoToWindow(msg) {
    infoMessage.innerHTML = msg;
}

function filterDate(key) {
    return key.getTime() > fromDate.getTime();
}

function printTicketsIfComplete() {
    if (tickets.size === ticketsLength) {
        infoMessage.innerHTML = '';
        let tickets2 = new Map([...tickets].filter(function(entry) {
            return filterDate(entry[0]);
        }));
        tickets2 = new Map([...tickets2.entries()].sort(function(a, b) {
            return b[0] - a[0];
        }));
        infoToWindow(`Total Tickets: ${tickets2.size}`);
        printToWindow(Array.from(tickets2.values()).join(''));
    }
}

function getSubDomains(str) {
    const results = str.match(/(^\w+:\/\/)([^.]+)/);
    results.splice(0, 1);
    results.push(...str.match(/\.\w+/g));
    return results;
}

function fetchTickets() {
    getTickets(orgId, printTicketsIfComplete);
}

function getAll() {
    fromDate = new Date(0);
    setupBody();
    allButton.style = selectedStyle;
    fetchTickets();
}

function get3Months() {
    fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);
    setupBody();
    months3Button.style = selectedStyle;
    fetchTickets();
}

function get6Months() {
    fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 6);
    setupBody();
    months6Button.style = selectedStyle;
    fetchTickets();
}

const startOrgUrl = `https://${subdomains[1]}.zendesk.com/agent/organizations/`;

if (document.URL.startsWith(startOrgUrl)) {
    newWindow = window.open('', 'chrome-extension-zendesk');
    const lastPart = document.URL.substring(startOrgUrl.length);
    orgId = lastPart.substring(0, lastPart.indexOf('/'));
    getAll();
} else {
    // do nothing
}
