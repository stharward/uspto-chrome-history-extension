/*
Written by Soren Harward <soren.harward@uspto.gov>, May 2015

This software was made by an employee of the United States Government as part
of his official duties. As such, it is not subject to copyright in the United
States. It is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this
software, either in source code form or as a compiled binary, for any purpose,
commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author of this software
dedicates any and all copyright interest in the software to the public domain.
I make this dedication for the benefit of the public at large and to the
detriment of our heirs and successors. I intend this dedication to be an overt
act of relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHOR, THE UNITED STATES PATENT AND TRADEMARK OFFICE, THE UNITED STATES
DEPARTMENT OF COMMERCE, OR ANY OTHER DEPARTMENT, BODY, AGENCY, DIVISION,
SECTION, OR GROUP OF THE UNITED STATES GOVERNMENT BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
*/

function makeCheckBoxToggler(mastercb, cblist) {
  return function() {
    for (var i=0; i<cblist.length; i++) {
      cblist[i].checked = mastercb.checked;
    }
  }
}

function renderHistoryTable(divName, website, historyData) {
  var d = document.getElementById(divName);

  // generate header
  var t = document.createElement('table');
  t.className = 'selectable';
  var h = t.createTHead();
  var hr = h.insertRow(0);
  var hc = hr.insertCell(0);
  var hcb = document.createElement('input');
  hcb.type = 'checkbox';
  hcb.checked = false;
  hc.appendChild(hcb);
  hc = hr.insertCell(1);
  hc.colSpan = 2;
  hc.textContent = "searches on " + website;

  // generate body
  var childcbs = [];
  var tBody = document.createElement('tbody');
  var lastvisit = 0;
  var border = ''
  for (var i = 0; i < historyData.length; ++i) {
    // put a subtle visual separator between queries that happened more than 1 hour apart
    var brd = ((lastvisit - historyData[i]['lastvisit']) > 3600000) ? 'thin solid #009' : 'none';
    lastvisit = historyData[i]['lastvisit'];

    var r = tBody.insertRow(i);
    var tc = r.insertCell(0);
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'historyentry';
    cb.value = JSON.stringify(historyData[i]);
    cb.checked = false;
    childcbs.push(cb);
    tc.appendChild(cb);
    tc.style.borderTop = brd;
    tc = r.insertCell(1);
    tc.innerHTML = historyData[i]['timestamp'];
    tc.style.borderTop = brd;
    tc = r.insertCell(2);
    tc.innerHTML = historyData[i]['query'];
    tc.style.borderTop = brd;
  }
  hcb.onchange = makeCheckBoxToggler(hcb,childcbs);
  t.appendChild(tBody);
  d.appendChild(t);
  d.appendChild( document.createElement('hr') );
}

function makeHistoryItemProcessor(divName, website, queryExtractionF, shortQueryThreshold) {
  return function historyItemProcessor(historyItems) {

    for (var i = historyItems.length - 1; i > 0; --i) {
      var d = historyItems[i-1].lastVisitTime - historyItems[i].lastVisitTime;
      if (d < shortQueryThreshold) {
        // ignore queries that were viewed for less than shortQueryThreshold milliseconds
        historyItems.splice(i,1);
      }
    }

    var tableEntries = [];
    var queries = {}
    for (var i = 0; i < historyItems.length; ++i) {
      var e = {
        'website': website,
        'url': historyItems[i].url,
        'query': queryExtractionF(historyItems[i]),
        'lastvisit': historyItems[i].lastVisitTime,
        'timestamp': (new Date(historyItems[i].lastVisitTime)).toLocaleString(),
        'id': historyItems[i].id
      };
      e['timestamp'] = e['timestamp'].replace(/[, ]+/g, '&nbsp;');
      if (e['query']) {
        // filter out duplicate queries; Chrome creates different history entries 
        // when the user goes to the 2nd, 3rd, etc. page of search results, because
        // these have unique URLs.  However, for the purposes of a prior art search
        // history, it's all just one query.
        if (!(e['query'] in queries)) {
          tableEntries.push(e);
          queries[e['query']] = true;
        }
      }
    }
    renderHistoryTable(divName, website, tableEntries);
  };
}

function buildAvailableHistoryList(divName, cutoff, shortQueryThreshold) {
  var cutoffTime = (new Date).getTime() - (1000 * cutoff);

  // clear the existing entries
  document.getElementById(divName).textContent = '';

  var websites = [
    {'website':'Google Books',
      'matchpattern':'tbm=bks',
      'queryextractor':function(h) { return h.title.slice(0,-15); }
    },
    {'website':'Google Images',
      'matchpattern':'tbm=isch',
      'queryextractor':function(h) { return h.title.slice(0,-15); }
    },
    {'website':'Google Scholar',
      'matchpattern':'scholar.google.com',
      'queryextractor':function(h) { return h.title.slice(0,-17); }
    },
    {'website':'Google Patents (old)',
      'matchpattern':'tbm=pts',
      'queryextractor':function(h) { return h.title.slice(0,-16); }
    },
    {'website':'Google Patents',
      'matchpattern':'patents.google.com',
      'queryextractor':function(h) {
        if (h.url.indexOf('?') >= 0) {
          u = h.url.split('?')[1];
          u = u.split('&');
          s = '<dl>';
          tc = 0;
          for (var i = 0; i < u.length; i++) {
            if (u[i].substr(0,2) == 'q=') {
              s += '<dt>Keyword ' + (++tc).toString() + '</dt>';
              s += '<dd>' + decodeURIComponent(u[i].substr(2).replace(/\+/g,' ').replace(/,/g,' OR ')) + '</dd>';
            } else if (u[i].substr(0,4) == 'cpc=') {
              s += '<dt>CPC</dt>';
              s += '<dd>' + decodeURIComponent(u[i].substr(4)) + '</dd>';
            }
          }
          s += '</dl>';
        } else {
          s = '';
        }
        return s;
      }
    }
  ]

  for (var i = 0; i < websites.length; i++) {
    w = websites[i];
    chrome.history.search({
        'startTime': cutoffTime,  // starting with the specified cutoff time ...
        'text': w['matchpattern'] // ... return all results from the website
      },
      makeHistoryItemProcessor(divName, w['website'], w['queryextractor'], shortQueryThreshold) // this is a closure
    );
  }
}

document.addEventListener('DOMContentLoaded',
  function() { buildAvailableHistoryList("availableHistoryList_div", 86400, 0); }
);
