var tickets=new Map();
var ticketsLength=0;
var newWindow;
var subdomains=getSubDomains(document.URL);
var token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
var startURL=subdomains.join('');

async function getTicket(ticketId,_callback) {
    fetch(startURL+"/tickets/"+ticketId+"/print", {
        method: 'GET',
        credentials: 'include',
        headers: {
                'X-CSRF-Token': token
            }
    }).then(function(responseTicket) {
        printToWindow( 'Ticket details '+ticketId);
        responseTicket.text().then( (html) => {
            tickets.set(ticketId,html);
            if(_callback){
                _callback();
            }
        });
    });
}

async function getTickets(orgId,_callback){
    printToWindow( 'FETCHING...');
    fetch(startURL+"/api/v2/views/preview.json?_include_archive=true&per_page=300&page=1", {
        method: 'POST',
        credentials: 'include',
        headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token
            },
        body: '{"view":{"all":[{"field":"organization","operator":"is","value":'+orgId+'}],"output":{"columns":["status","id","subject","requester","created","updated","group","assignee"],"group_by":"status","group_order":"asc","sort_by":"updated","sort_order":"desc"}}}'
    }).then(function(response) {
        response.clone().json().then((json) => {
            var ticketRows=json.rows;
            ticketsLength=ticketRows.length;
            printToWindow( 'Tickets length '+ticketsLength);
            for(let i=0;i<ticketRows.length;i++) {
                var ticketId=ticketRows[i].ticket.id;
                getTicket(ticketId,_callback);
            }
        })

    });
}


function printToWindow(msg) {
    newWindow.document.body.innerHTML = null;
    newWindow.document.writeln(msg);
}


function printTicketsIfComplete(){
    if(tickets.size==ticketsLength) {
        tickets = new Map([...tickets.entries()].sort((a, b) => b[0] - a[0]));
        printToWindow(Array.from(tickets.values()).join(''));
    }
}

function getSubDomains(str){
    var results = str.match(/(^\w+:\/\/)([^.]+)/);
    results.splice(0, 1);
    results = results.concat(str.match(/\.\w+/g));
    return results;
}
var startOrgUrl='https://'+subdomains[1]+'.zendesk.com/agent/organizations/';
if(document.URL.startsWith(startOrgUrl)) {
    newWindow = window.open('','chrome-extension-zendesk');
    newWindow.document.body.innerHTML = null;
    var lastPart=document.URL.substring(startOrgUrl.length);
    var orgId=lastPart.substring(0,lastPart.indexOf('/'));
    getTickets(orgId,printTicketsIfComplete);
} else {
    //do nothing

}
