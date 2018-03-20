/*
@licstart  The following is the entire license notice for the 
JavaScript code in this page.

Copyright (C) 2015-2016  Sylvain Boily <sylvainboilydroid@gmail.com>

The JavaScript code in this page is free software: you can
redistribute it and/or modify it under the terms of the GNU
General Public License (GNU GPL) as published by the Free Software
Foundation, either version 3 of the License, or (at your option)
any later version.  The code is distributed WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

As additional permission under GNU GPL version 3 section 7, you
may distribute non-source (e.g., minimized or compacted) forms of
that code without the copy of the GNU GPL normally required by
section 4, provided you include this license notice and a URL
through which recipients can access the Corresponding Source.

@licend  The above is the entire license notice
for the JavaScript code in this page.
*/


var mediaStream;
var auth;
var confd;
var agentd;
var cc;
var debug;

function printCallLogs() {
    calllogs = ctxStorage.getCallLog();

    $('#result-calllogs').empty();
    $('#calllogs-box').slimScroll({
        height: '250px'
    });

    $('#clean-calllogs').on('click', function() {
        ctxStorage.removeCallLog();
        $('#result-calllogs').empty();
    });

    if (calllogs) {
        c = [];

        $.each(calllogs, function(key, value) {
            c.push(value);
        });

        c.sort(function(a, b) {
            return b.start - a.start;
        });

        $.each(c, function(key, value) {
            if (value.flow === "incoming") { callIcon = 'fa-chevron-left'; }
            if (value.flow === "outgoing") { callIcon = 'fa-chevron-right'; }

            duration = '-';
            if (value.stop) {
                duration = moment.duration(value.stop - value.start).seconds() + ' sec';
            }
            $('<tr>')
                 .append($('<td>').append($('<i>', { class: 'fa fa-fw ' + callIcon })))
                 .append($('<td>').append($('<a>', { id: "c2ccdr-" + key, href: "#" }).append(value.clid || 'unknown').attr('data', value.number)))
                 .append($('<td>').append(moment(value.start).format('MMM Do YYYY')))
                 .append($('<td>').append(moment(value.start).format('HH:mm:ss')))
                 .append($('<td>').append(duration))
                 .appendTo('#result-calllogs');

            $('#c2ccdr-' + key).on('click', function() {
                number = value.clid;
                if (value.number) {
                    number = value.number
                }
                $('#number').val(number)
                doCall();
            });
        });

    }
}