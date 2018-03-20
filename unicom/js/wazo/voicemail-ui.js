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

function loadVoicemails() {
    cc.list_my_voicemails()
      .done(function(data) {
        printVoicemails(data);
      });
}

function printVoicemails(data) {
    $('#view-voicemails').removeClass('hidden');

    $.each(data.folders, function(k, v) {
        $.each(v.messages, function(key, value) {
            printVoicemail(v, value);
        });
    });
}

function removeVoicemails() {
    $('#view-voicemails').addClass('hidden');
}

function printVoicemail(v, value) {
    actions = $('<td>')
        .append($('<a>', {'id': 'vm-listen-' + value.id})
            .append($('<i>', {'class': "material-icons btn btn-default btn-xs", 'text': 'play_arrow'})))
        .append($('<a>', {'id': 'vm-download-' + value.id})
            .append($('<i>', {'class': "material-icons btn btn-default btn-xs", 'text': 'cloud_download'})))
        .append($('<a>', {'id': 'vm-delete-' + value.id})
            .append($('<i>', {'class': "material-icons btn btn-default btn-xs", 'text': 'delete'})));

    date = moment.unix(value.timestamp).format('MMM Do YYYY');
    hour = moment.unix(value.timestamp).format('HH:mm');
    voicemail = $('<tr>')
        .append($('<td>')
          .append($('<i>', { 'class': "material-icons md-18", 'text': getVoicemailStatus(v.type) })))
        .append($('<td>', { html: date }))
        .append($('<td>', { html: hour }))
        .append($('<td>', { html: value.caller_id_name }))
        .append($('<td>', { html: value.duration + ' sec' }))
        .append(actions);

    audio = $('<audio>', {
        id: 'vm-audio-' + value.id,
        src: listenVoicemail(value.id),
        preload: 'none'
    });

    actions.append(audio);

    $('#result-voicemails').append(voicemail);

    addVoicemailAction(value.id);
}

function listenVoicemail(voicemail_id) {
    return cc.listen_my_message(voicemail_id);
}

function addVoicemailAction(id) {
    var sound = [];
    var icon = [];
    var download = [];

    $('#vm-listen-' + id).on('click', function(e) {
        e.preventDefault();
        icon[id] = $(this).find('i');
        sound[id] = document.getElementById('vm-audio-' + id);
        switch (icon[id].text()) {
            case 'play_arrow':
                sound[id].play();
                sound[id].addEventListener('ended', function() {
                    icon[id].text('play_arrow');
                });
                icon[id].text('pause');
                break;
            case 'pause':
                sound[id].pause();
                icon[id].text('play_arrow');
                break;
        }
    });

    $('#vm-download-' + id).on('click', function(e) {
        e.preventDefault();
        download[id] = $('#vm-audio-' + id).attr('src');
        window.location.href = download[id];
    });

    $('#vm-delete-' + id).on('click', function() {
        delete_message = confirm("Are you sure you want to delete this message?");
        if (delete_message) {
          cc.delete_my_message(id)
            .done(printDebug);
        }
    });
}

function getVoicemailStatus(type) {
    switch (type) {
        case 'old':
            msg_status = 'drafts';
            break;
        case 'urgent':
            msg_status = 'new_releases';
            break;
        case 'other':
            msg_status = 'mail_outline';
            break;
        default:
            msg_status = 'markunread'
    }

    return msg_status;
}

function removeVoicemail(id) {
    $('#vm-audio-' + id).parent().parent().remove();
}

function updateVoicemailStatus(id, type) {
    $('#vm-audio-' + id).parent()
                        .parent()
                        .find('td')
                        .first()
                        .find('i')
                        .text(getVoicemailStatus(type));
}

function createVoicemailMessageStatus(data) {
    caller = data.message.caller_id_name || data.message.caller_id_num;
    sendNotification("New voicemail message", "You received a new message from " + caller);
    printVoicemail(data.message.folder, data.message);
}

function updateVoicemailMessageStatus(data) {
    updateVoicemailStatus(data.message.id, data.message.folder.type);
}

function deleteVoicemailMessageStatus(data) {
    removeVoicemail(data.message.id);
}