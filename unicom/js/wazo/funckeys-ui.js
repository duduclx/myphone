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

function loadFuncKeys() {
    confd.user_list_fk(ctxStorage.getUuid())
      .done(function(data) {
        printFuncKeys(data);
      })
      .fail(printDebug);
}

function printFuncKeys(data) {
    $('#view-fk-box').slimScroll({
        height: '220px'
    });

    $('#savefk').on('click', function(e) {
      e.preventDefault();
      position = $('#positionfk').val();
      destination = { type: 'custom', exten: $('#extenfk').val() }
      fk = {
        destination: destination,
        label: $('#labelfk').val(),
        blf: true
      };
      addFunctionKey(position, fk);
      $('#view-add-fk').modal('hide');
    });

    $.each(data.keys, function(key, value) {
        printFuncKey(key, value);
    });
}

function printFuncKey(position, value) {
    actions = $('<a>', {
      id: 'fk-' + position,
    });

    action_delete = $('<i>', {
      class: 'material-icons btn btn-default btn-xs',
      html: 'delete'
    }).appendTo(actions);

    $('<tr>', { id: 'fkrow-' + position })
      .append($('<td>'))
      .append($('<td>', { html: position }))
      .append($('<td>', { html: value.destination.type || '-' }))
      .append($('<td>', { html: getFuncKeyDestination(value.destination) }))
      .append($('<td>', { html: value.label || '-' }))
      .append($('<td>', { html: value.blf ? 'Yes': 'No' }))
      .append($('<td>').append(actions))
        .appendTo($('#result-funckeys'));

    $('#fk-' + position).on('click', function() {
        removeFunctionKey(position);
    });
}

function getFuncKeyDestination(fk) {
    switch(fk.type) {
      case 'user':
        return fk.user_firstname+' '+fk.user_lastname;
      case 'group':
        return fk.group_name;
      case 'service':
        return fk.service;
      case 'custom':
        return fk.exten;
      case 'agent':
        return fk.action;
      case 'park_position':
        return fk.position;
      case 'transfer':
        return fk.transfer;
      case 'forward':
        return fk.forward;
      default:
        return '-';
    }
}

function removeFunctionKey(position) {
    confd.user_remove_fk(ctxStorage.getUuid(), position)
      .done(function() {
          $('#fkrow-' + position).remove();
      })
      .fail(printDebug);
}

function addFunctionKey(position, fk) {
    confd.user_add_fk(ctxStorage.getUuid(), position, fk)
      .done(function(data) {
        printFuncKey(position, fk);
      })
      .fail(printDebug);
}