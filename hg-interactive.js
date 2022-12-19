function generateHistoryPage() {
  f = document.forms['historyEntriesForm'].querySelectorAll('input.historyentry');
  var entries = []
  for (i = 0; i < f.length; i++) {
    if (f[i].checked) {
      entries.push(JSON.parse(f[i].value));
    }
  }

  entries.sort(function(a,b){return a.lastvisit - b.lastvisit});

  var h = document.createElement('h1');
  h.textContent = 'Web Search History';
  document.getElementById('printable_div').appendChild(h);
  
  var t = document.createElement('table');
  t.className = 'printable';
  h = t.createTHead();
  hr = h.insertRow(0);
  hc = hr.insertCell(0);
  hc.textContent = 'date, time';
  hc = hr.insertCell(1);
  hc.className += 'website';
  hc.textContent = 'web site';
  hc = hr.insertCell(2);
  hc.textContent = 'search string';

  var tBody = document.createElement('tbody');
  for (var i = 0; i < entries.length; ++i) {
    r = tBody.insertRow(i);
    tc = r.insertCell(0);
    tc.textContent = entries[i]['timestamp'];
    tc = r.insertCell(1);
    tc.className += 'website';
    tc.textContent = entries[i]['website'];
    tc = r.insertCell(2);
    tc.textContent = entries[i]['query'];
  }
  t.appendChild(tBody);
  document.getElementById('printable_div').appendChild(t);

  document.getElementById('selection_div').textContent = '';
  document.getElementById('instructions_div').textContent = '';
}

window.onload = function() {
  document.getElementById('generateHistoryPageButton').onclick = generateHistoryPage;
}
