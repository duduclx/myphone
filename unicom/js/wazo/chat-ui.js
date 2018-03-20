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

var chatAddMsg = function(chat) {
    direction = 'left';
    classchatname = 'pull-left';
    classchattime = 'pull-right';

    if (chat.is_me == false) {
        direction = 'right';
        classchatname = 'pull-right';
        classchattime = 'pull-left';
    }

    if (typeof chat.time == "string") {
        chat.time = (new Date(chat.time));
    }

    return $('<div>', { 'class': 'direct-chat-msg ' + direction })
           .append($('<div>', { 'class': 'direct-chat-info clearfix' })
               .append($('<span>', { 'class': 'direct-chat-name ' + classchatname,
                                     'html': chat.alias
                                }))
               .append($('<span>', { 'class': 'direct-chat-timestamp ' + classchattime,
                                     'html': addZero(chat.time.getHours()) + ':' + addZero(chat.time.getMinutes())
                                      })))
           .append($('<img>', { 'class': 'direct-chat-img',
                                'src': 'img/user.jpg',
                                'alt': 'user image'
                                        }))
           .append($('<div>', { 'class': 'direct-chat-text', 'html': emoji.replace_emoticons(htmlEntities(chat.msg)) }));
}

var eventChat = function(to, id) {
    $('#direct-chat-' + id).find('#msgchat').keypress(function(event) {
        if (event.which == 13) {
            sendChatMsg(to, id);
        }
    });

    $('#direct-chat-' + id).find('#sendchat').off('click').click(function(e) {
        sendChatMsg(to, id);
    });

}

var receivedChatEvent = function(data) {
    if (data.to[0] == ctxStorage.getSession().xivo_uuid && data.to[1] == ctxStorage.getUuid()) {
        id = data.from[1];
        chatCreateSession(id, data.alias, false);
        eventChat(data.from, id);
        prepareChatMessage(data.msg, data.alias, id, false);
    }
}

var sendChatMsg = function(to, id) {
    var inputmsg = $('#direct-chat-' + id).find('#msgchat');
    var msg = inputmsg.val();

    if (msg) {
        cc.send_my_message(to[0], to[1], msg, ctxStorage.getUser().displayname)
          .done(function() {
            prepareChatMessage(msg, "You", id, true);
          })
          .fail(function() {
            chat = {
                id: id,
                alias: "Chat bot (error)",
                msg: "Sorry! We can't send your message...",
                is_me: false,
                time: new Date()
            }
            writeChatMessage(chat);
          });
        inputmsg.val('');
    }
}

function prepareChatMessage(msg, alias, id, is_me) {
    chat = {
        id: id,
        alias: alias,
        msg: msg,
        is_me: is_me,
        time: new Date()
    }

    ctxStorage.storeChatSession(chat);
    if (is_me == false) {
        msg = chat.msg;
        if (msg.length > MAX_CHAT_MSG_NOTIFICATION) {
            msg = msg.substr(0, MAX_CHAT_MSG_NOTIFICATION) + " (...)";
        }
        sendNotification("Chat message from: " + chat.alias, msg);
    }
    writeChatMessage(chat);
}

var writeChatMessage = function(chat) {
    $('#direct-chat-' + chat.id).find('.direct-chat-messages').append(chatAddMsg(chat));
    $('#direct-chat-' + chat.id).find('.direct-chat-messages').slimScroll({
        scrollBy: '100px'
    });
}

var isActiveChatSession = function(id, click) {

    if (ctxStorage.getChatActiveSession() == null || ctxStorage.getChatActiveSession() == id || click == true) {
        ctxStorage.storeChatActiveSession(id);
        return true;
    }

    $.each($('.direct-chat'), function(key, value) {
        isNotActiveChat = $(value).hasClass('hidden');
        if (isNotActiveChat == true) {
            if (value.id == 'direct-chat-' + id) {
                $('#chat-' + id).addClass('fa-blink');
            }
        }
    });

    return false;
}

var chatCreateSession = function(id, alias, click) {


        if ($('#direct-chat-' + id).length == 0) {
            printDebug("Create new chat session");
            $('#direct-chat').clone().appendTo("#chat").prop('id', 'direct-chat-' + id);
            chatLog = ctxStorage.getChatLog(id);
            $.each(chatLog, function(key, value) {
                writeChatMessage(value);
            });
        } else {
            $('#direct-chat-' + id).show();
        }

        isActiveSession = isActiveChatSession(id, click)

        if (isActiveSession == true) {
            $('.direct-chat').addClass('hidden').hide();
            $('#direct-chat-' + id).removeClass('hidden').show();
            $('#direct-chat-' + id).find('#chat-alias').text(alias);
            $('#chat-' + id).removeClass('fa-blink');
        }
}

var chatcontact = function(contact) {

    if (ctxStorage.getChatActiveSession() == contact.user_uuid) {
        openChatSession(contact);
    }

    $('#chat-' + contact.user_uuid).click(function() {
        openChatSession(contact);
    });
}

function cleanChatHistory() {
    $('#clean-chat-history').on('click', function() {
        ctxStorage.removeChatHistory();
    });
}

function openChatSession(contact) {
    chatCreateSession(contact.user_uuid, contact.name, true);
    eventChat([contact.xivo_uuid, contact.user_uuid], contact.user_uuid);
}

function addChatAction(value) {
    if (value.user_uuid) {
        chaticon = '';
        if (value.presence && (value.presence != 'disconnected' && value.presence != 'no-supported')) {
            chaticon = 'fa-comment';
        }
        chat = $('<i>', {
            'id': 'chat-' + value.user_uuid,
            'class': 'fa fa-fw ' + chaticon
        }).data('user', value.user_uuid)
          .data('xivo', value.xivo_uuid)
          .data('alias', value.name);

        $('#actionsfavorite-' + value.source + '-' + value.source_entry_id)
          .append(chat);

        chatcontact(value);
    }
}