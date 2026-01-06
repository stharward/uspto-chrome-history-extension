/*
Written by Soren Harward <soren.harward@uspto.gov>, 2015-2025

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
    for (i=0; i<cblist.length; i++) {
      cblist[i].checked = mastercb.checked;
    }
  }
}

function renderHistoryTable(divName, website, historyData) {
  d = document.getElementById(divName);

  // generate header
  t = document.createElement('table');
  t.className = 'selectable';
  h = t.createTHead();
  hr = h.insertRow(0);
  hc = hr.insertCell(0);
  hcb = document.createElement('input');
  hcb.type = 'checkbox';
  hcb.checked = false;
  hc.appendChild(hcb);
  hc = hr.insertCell(1);
  hc.colSpan = 2;
  hc.textContent = "searches on " + website;

  // generate body
  childcbs = [];
  tBody = document.createElement('tbody');
  lastvisit = 0;
  border = ''
  for (i = 0; i < historyData.length; ++i) {
    // put a subtle visual separator between queries that happened more than 1 hour apart
    brd = ((lastvisit - historyData[i]['lastvisit']) > 3600000) ? 'thin solid #009' : 'none';
    lastvisit = historyData[i]['lastvisit'];

    r = tBody.insertRow(i);
    tc = r.insertCell(0);
    cb = document.createElement('input');
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

    tableEntries = [];
    keptHistoryItems = [];
    if (historyItems.length > 0) {
      queries = {}
      for (i = historyItems.length - 1; i >= 0; --i) {
        e = {
          'website': website,
          'url': historyItems[i].url,
          'query': queryExtractionF(historyItems[i]),
          'lastvisit': historyItems[i].lastVisitTime,
          'timestamp': (new Date(historyItems[i].lastVisitTime)).toLocaleString().replace(/[, ]+/g, '&nbsp;'),
          'id': historyItems[i].id
        };
        //console.log(website, historyItems[i], e);
        if (e['query']) {
          // filter out duplicate queries; Chrome creates different history entries 
          // when the user goes to the 2nd, 3rd, etc. page of search results, because
          // these have unique URLs.  However, for the purposes of a prior art search
          // history, it's all just one query.
          if (!(e['query'] in queries)) {
            keptHistoryItems.unshift(e);
            queries[e['query']] = true;
          }
        }
      }
    }

    //console.log(website, keptHistoryItems);
    if (keptHistoryItems.length > 0) {
      tableEntries.push(keptHistoryItems[0]);

      // keep only the queries that were viewed for longer than shortQueryThreshold milliseconds
      for (i = 1; i < keptHistoryItems.length; ++i) {
        d = keptHistoryItems[i-1].lastvisit - keptHistoryItems[i].lastvisit;
        //console.log(i, keptHistoryItems[i].lastvisit, d);
        if (d > shortQueryThreshold) {
          tableEntries.push(keptHistoryItems[i]);
        }
      }
    }
    renderHistoryTable(divName, website, tableEntries);
  };
}

function buildAvailableHistoryList(divName, cutoff, shortQueryThreshold) {
  cutoffTime = (new Date).getTime() - (1000 * cutoff);

  // clear the existing entries
  document.getElementById(divName).textContent = '';

  /* searching history for different sites would be a lot more elegant with a
   * regex, but browser.history.search() doesn't officially support regexes in
   * the 'text' parameter. I tried it anyway, and it seems comically
   * inconsistent about what regex features it does support. */
  const websites = [
    {'website':'Google Books',
      'matchpattern':'google.com/search?q=',
      'queryextractor':function(h) {
        const params = new URL(h.url).searchParams;
        s = '';
        if (params.get('udm') === '36') {
          if (params.has('q')) {
            s = params.getAll('q').join(' ');
          }
        }
        return s;
      }
    },
    {'website':'Google Images',
      'matchpattern':'google.com/search?q=',
      'queryextractor':function(h) {
        const params = new URL(h.url).searchParams;
        s = '';
        if (params.get('udm') === '2') {
          if (params.has('q')) {
            s = params.getAll('q').join(' ');
          }
        }
        return s;
      }
    },
    {'website':'Google Scholar',
      'matchpattern':'scholar.google.com/',
      'queryextractor':function(h) {
        const params = new URL(h.url).searchParams;
        if (params.has('q') && (params.get('q') !== 'related')) {
          s = params.getAll('q').join(' ');
          if (params.get('as_ylo')) {
            s += ' [after:' + params.get('as_ylo') + ']';
          }
          if (params.get('as_yhi')) {
            s += ' [before:' + params.get('as_yhi') + ']';
          }
          return s;
        } else if (params.has('as_q')) {
          s = '<dl>'
          /* TODO: append "title only" to keyword labels when as_occt=title */
          for (const [index, kwg] of params.getAll('as_q').entries()) {
            s += '<dt>Search term ' + (index + 1) + '</dt>';
            s += '<dd>' + kwg + '</dd>';
          }
          if (params.get('as_epq')) {
            s += '<dt>Exact phrase</dt>';
            s += '<dd>' + params.get('as_epq') + '</dd>';
          }
          if (params.get('as_oq')) {
            s += '<dt>At least one of</dt>';
            s += '<dd>' + params.getAll('as_oq').join(' ') + '</dd>';
          }
          if (params.get('as_eq')) {
            s += '<dt>Without keywords</dt>';
            s += '<dd>' + params.getAll('as_eq').join(' ') + '</dd>';
          }
          if (params.get('as_publication')) {
            s += '<dt>Published in</dt>';
            s += '<dd>' + params.get('as_publication') + '</dd>';
          }
          if (params.get('as_sauthors')) {
            s += '<dt>Author(s)</dt>';
            for (const a of params.getAll('as_sauthors')) {
              s += '<dd>' + a + '</dd>';
            }
          }
          if (params.get('as_ylo')) {
            s += '<dt>Published after</dt>';
            s += '<dd>' + params.get('as_ylo') + '</dd>';
          }
          if (params.get('as_yhi')) {
            s += '<dt>Published before</dt>';
            s += '<dd>' + params.get('as_yhi') + '</dd>';
          }
          s += '</dl>';
          return s;
        } else {
          return;
        }
      }
    },
    {'website':'Google Patents',
      'matchpattern':'patents.google.com/',
      'queryextractor':function(h) {
        hu = new URL(h.url);
        if ((hu.hostname === 'patents.google.com')) {
          const params = new URL(h.url).searchParams;
          if (params.get('q')) {
            s = '<dl>';
            for (const [index, kwg] of params.getAll('q').entries()) {
              s += '<dt>Search term ' + (index + 1) + '</dt>';
              s += '<dd>' + kwg + '</dd>';
            }
            s += '</dl>';
            if (params.get('inventor')) {
              s += '<dt>Inventor(s)</dt>';
              s += '<dd> [' + params.get('inventor').replace(/,/g,'] OR [') + ']</dd>';
            }
            if (params.get('assignee')) {
              s += '<dt>Assignee(s)</dt>';
              for (const asn of params.getAll('assignee')) {
                s += '<dd> [' + asn.replace(/,/g,'] OR [') + ']</dd>';
              }
            }
            if (params.get('country')) {
              s += '<dt>Patent Office(s)</dt>';
              for (const asn of params.getAll('country')) {
                s += '<dd> [' + asn.replace(/,/g,'] OR [') + ']</dd>';
              }
            }
            if (params.get('language')) {
              s += '<dt>Language(s)</dt>';
              for (const asn of params.getAll('language')) {
                s += '<dd> [' + asn.replace(/,/g,'] OR [').toLowerCase() + ']</dd>';
              }
            }
            if (params.get('after')) {
              [label, date] = decodeURIComponent(params.get('after')).split(':');
              label = label.replace(/^[a-z]/, char => char.toUpperCase());
              s += '<dt>' + label + ' date is after</dt>';
              s += '<dd>' + date + '</dd>';
            }
            if (params.get('before')) {
              [label, date] = decodeURIComponent(params.get('before')).split(':');
              label = label.replace(/^[a-z]/, char => char.toUpperCase());
              s += '<dt>' + label + ' date is before</dt>';
              s += '<dd>' + date + '</dd>';
            }
            return s;
          } else {
            return;
          }
        } else {
          return;
        }
      }
    },
    {'website':'Google Web Search',
      'matchpattern':'google.com/search?q',
      'queryextractor':function(h) {
        const params = new URL(h.url).searchParams;
        s = '';
        // vanilla Google searches don't have the UDM parameter
        if (params.get('udm') === null) {
          if (params.has('q')) {
            s = params.getAll('q').join(' ');
          }
        }
        return s;
      }
    },
    {'website':'Bing Web Search',
      'matchpattern':'bing.com/search?q',
      'queryextractor':function(h) {
        const params = new URL(h.url).searchParams;
        s = '';
        if (params.has('q')) {
          s = params.getAll('q').join(' ');
        }
        return s;
      }
    },
    {'website':'Bing Images',
      'matchpattern':'bing.com/images/search?q',
      'queryextractor':function(h) {
        const params = new URL(h.url).searchParams;
        s = '';
        if (params.has('q')) {
          s = params.getAll('q').join(' ');
        }
        return s;
      }
    },
    {'website':'Bing Copilot Search',
      'matchpattern':'bing.com/copilotsearch?q',
      'queryextractor':function(h) {
        const params = new URL(h.url).searchParams;
        s = '';
        if (params.has('q')) {
          s = params.getAll('q').join(' ');
        }
        return s;
      }
    },
    {'website':'IEEE Xplore',
      'matchpattern':'ieeexplore.ieee.org/search/searchresult.jsp?',
      'queryextractor':function(h) { return (new URLSearchParams(h.url)).get('queryText'); }
    }
  ]

  for (i = 0; i < websites.length; i++) {
    w = websites[i];
    chrome.history.search({
        'maxResults': 10000,      // defaults to 100, but some examiners have many more
        'startTime': cutoffTime,  // starting with the specified cutoff time ...
        'text': w['matchpattern'] // ... return results from the website
      },
      makeHistoryItemProcessor(divName, w['website'], w['queryextractor'], shortQueryThreshold) // this is a closure
    );
  }
}

document.addEventListener('DOMContentLoaded',
  function() { buildAvailableHistoryList("availableHistoryList_div", 86400, 1000); }
);
