var tickets=new Map();
var ticketsLength=0;
var newWindow;
var subdomains=getSubDomains(document.URL);
var token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
var startURL=subdomains.join('');
var fromDate=new Date(0);
var allButton=null;
var months3Button=null;
var months6Button=null;
var infoMessage=null;
var selectedStyle="background: #000000;color: #ffffff;padding: 0.5rem 1rem;border-radius: 0.5rem;"+
                    "cursor: hand;font-family: Arial, Helvetica, sans-serif;font-size: 14px;margin-top: 10px;"+
                       "margin-bottom: 10px;margin-right: 10px;margin-left: 10px;";
var unselectedStyle="background: #A5D6A7;color: #ffffff;padding: 0.5rem 1rem;border-radius: 0.5rem;"+
                    "cursor: hand;font-family: Arial, Helvetica, sans-serif;font-size: 14px;margin-top: 10px;"+
                       "margin-bottom: 10px;margin-right: 10px;margin-left: 10px;";
var totalSize=0;

async function getTicket(ticketId,ticketDate,_callback) {
    fetch(startURL+"/tickets/"+ticketId+"/print", {
        method: 'GET',
        credentials: 'include',
        headers: {
                'X-CSRF-Token': token
            }
    }).then(function(responseTicket) {
        infoToWindow( 'Ticket details '+ticketId);
        responseTicket.text().then( (html) => {
            tickets.set(ticketDate,html);
            if(_callback){
                _callback();
            }
        });
    });
}

async function getTickets(orgId,_callback){
    infoToWindow( 'FETCHING...');
    if(tickets.size==0) {
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
                    infoToWindow( 'Tickets length '+ticketsLength);
                    for(let i=0;i<ticketRows.length;i++) {
                        var ticketId=ticketRows[i].ticket.id;
                        var ticketDate=new Date(ticketRows[i].created);
                        getTicket(ticketId,ticketDate,_callback);
                    }
                })

            });
    } else {
        printTicketsIfComplete();
    }

}

function setLabel(id,innerHtml,onclickFunction){
    var labelNode=newWindow.document.body.appendChild(document.createElement('label'));
    labelNode.id=id;
    labelNode.innerHTML=innerHtml;
    labelNode.style = unselectedStyle;
    labelNode.onclick=onclickFunction;
    return labelNode;
}

function setupBody(){
    newWindow.document.body.innerHTML = '';
    allButton=setLabel('all','All Tickets',getAll);
    months3Button=setLabel('3months','Last 3 months',get3Months);
    months6Button=setLabel('6months','Last 6 months',get6Months);
    infoMessage= newWindow.document.body.appendChild(document.createElement('div'));
    infoMessage.style='margin-top: 10px;margin-bottom: 10px;margin-right: 10px;margin-left: 10px;';
}


function printToWindow(msg) {
    newWindow.document.body.insertAdjacentHTML("beforeend",msg);
}

function infoToWindow(msg) {
    infoMessage.innerHTML=msg;
}

function filterDate(key) {
    console.log(key);
    return key.getTime() > fromDate.getTime();
}


function printTicketsIfComplete(){
    if(tickets.size==ticketsLength) {
        infoMessage.innerHTML='';
        var tickets2 = new Map(
                         [...tickets]
                         .filter((entry) => filterDate(entry[0]) ));
        tickets2 = new Map([...tickets2.entries()].sort((a, b) => b[0] - a[0]));
        infoToWindow("Total Tickets: "+tickets2.size);
        printToWindow(Array.from(tickets2.values()).join(''));
    }
}

function getSubDomains(str){
    var results = str.match(/(^\w+:\/\/)([^.]+)/);
    results.splice(0, 1);
    results = results.concat(str.match(/\.\w+/g));
    return results;
}

function fetchTickets(){
    getTickets(orgId,printTicketsIfComplete);
}

function getAll() {
    fromDate = new Date(0);
    setupBody();
    allButton.style=selectedStyle;
    fetchTickets();
}

function get3Months() {
    fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);
    setupBody();
    months3Button.style=selectedStyle;
    fetchTickets();
}

function get6Months() {
    fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 6);
    setupBody();
    months6Button.style=selectedStyle;
    fetchTickets();
}

var startOrgUrl='https://'+subdomains[1]+'.zendesk.com/agent/organizations/';
if(document.URL.startsWith(startOrgUrl)) {
    newWindow = window.open('','chrome-extension-zendesk');
    var lastPart=document.URL.substring(startOrgUrl.length);
    var orgId=lastPart.substring(0,lastPart.indexOf('/'));
    getAll();
} else {
    //do nothing

}
