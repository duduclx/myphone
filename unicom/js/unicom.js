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
var dird;
var cc;
var agentd;
var debug;

var background_login = ["img/background.jpg"];
var default_presence = 'available';

var emoji = new EmojiConvertor();
emoji.img_set = 'google';

var AdminLTEOptions = {
    navbarMenuSlimscroll: false
}

SIP.C.causes.TEMPORARILY_UNAVAILABLE = 'Temporarily Unavailable';
var USING_ONLY_HTTPS = false;
var MAX_CHAT_MSG_NOTIFICATION = 20;

$(document).ready(function() {

ctxStorage = {
    store: function(item, data) {
        localStorage.setItem(item, data);
    },
    storeSession: function(data) {
        session = {
            token: data.token,
            uuid: data.xivo_user_uuid || data.uuid,
            acls: data.acls,
            expires_at: moment(data.expires_at),
            xivo_uuid: data.xivo_uuid || null
        };

        this.store("session", JSON.stringify(session));
    },
    storeServer: function(server) {
        this.store("server", server);
    },
    storeUser: function(user) {
        this.store("user", JSON.stringify(user));
    },
    storeEndpointId: function(endpoint_id) {
        this.store("endpoint_id", endpoint_id);
    },
    storeXiVOUUID: function(xivo_uuid) {
        session = this.getSession()
        session.xivo_uuid = xivo_uuid;
        this.storeSession(session);
    },
    storeCallLog: function(session, status) {
        var log = {
            clid: session.remoteIdentity.displayName || session.remoteIdentity.uri.user,
            number: session.remoteIdentity.uri.user,
            id: session.uuid,
            time: new Date().getTime()
        },
        calllog = JSON.parse(this.getItem('calllog'));

        if (!calllog) { calllog = {}; }


        if (!calllog.hasOwnProperty(session.uuid)) {
            calllog[log.id] = {
                id: log.id,
                clid: log.clid,
                number: log.number,
                start: log.time,
                flow: session.direction
            }
        }

        if (status === 'terminated') {
            calllog[log.id].stop = log.time;
        }

        MAX_CALL_LOG_STORE = $('#callloghistorysize').val();
        if (Object.keys(calllog).length > MAX_CALL_LOG_STORE) {
            older_calllog = Object.keys(calllog)[0];
            delete calllog[older_calllog];
        }

        this.store("calllog", JSON.stringify(calllog));
        printCallLogs();
    },
    storeChatSession: function(chat) {
        chatLog = JSON.parse(this.getItem('chatlog'));

        if (!chatLog) { chatLog = {}; }

        if (!chatLog.hasOwnProperty(chat.id)) {
            chatLog[chat.id] = [];
        }

        chatLog[chat.id].push(chat);

        MAX_CHAT_LOG_STORE = $('#chathistorysize').val();
        if (Object.keys(chatLog[chat.id]).length > MAX_CHAT_LOG_STORE) {
            chatLog[chat.id].shift();
        }
        this.store("chatlog", JSON.stringify(chatLog));
    },
    storeChatActiveSession: function(id) {
        this.store("chatactivesession", id);
    },
    removeSession: function() {
        localStorage.removeItem("session");
        location.reload();
    },
    removeCallLog: function() {
        localStorage.removeItem("calllog");
    },
    removeChatHistory: function() {
        localStorage.remoeeItem("chatlog");
    },
    getItem: function(item) {
        return localStorage.getItem(item);
    },
    getServer: function(service) {
        server = getServerIP();
        port = ctxStorage.getItem("port") || 443;
        token = this.getToken();

        switch(service) {
            case "websocketd":
                host = "wss://" + server + ":9502/?token=" + token;
                if (USING_ONLY_HTTPS) {
                  host = "wss://" + server + ":" + port + "/api/websocketd/?token=" + token;
                }
                return host;
                break;
            case "asterisk":
                host = "wss://" + server + ":5040/ws";
                if (USING_ONLY_HTTPS) {
                  host = "wss://" + server + ":" + port + "/api/asterisk/ws";
                }
                return host;
                break;
        }
    },
    getSession: function() {
         return JSON.parse(this.getItem("session"));
    },
    getUser: function() {
         return JSON.parse(this.getItem("user"));
    },
    getCallLog: function() {
         return JSON.parse(this.getItem("calllog"));
    },
    getChatLog: function(id) {
         chatLog = JSON.parse(this.getItem("chatlog"));
         if (chatLog) {
             return chatLog[id];
         }
         return {};
    },
    getChatActiveSession: function() {
        return this.getItem("chatactivesession");
    },
    getToken: function() {
        if (this.getSession() !== null) {
          return this.getSession().token;
        }
        return null;
    },
    getUuid: function() {
        if (this.getSession() !== null) {
          return this.getSession().uuid;
        }
        return null;
    }

}

var loadLogin = function() {
    printDebug("Get login template...");
    return $.get('tpl/login.html', function(templates) {
        var template = $(templates).filter('#login_template').html();
        templateData = {};
        $('#auth').append(Mustache.render(template, templateData));
    });
}

var loadApp = function() {
    return $.get('tpl/application.html', function(templates) {
        var template = $(templates).filter('#app_template').html();
        templateData = {};
        $('#application').append(Mustache.render(template, templateData));
    });
}

function printDebug(data) {
    if (debug == 'true') {
      console.log(data);
    }
}

var createUA = function(config) {
    ua = new SIP.UA(config);
    return ua;
}

var createUACTI = function(config) {
    ua = new uacti();
    return ua;
}

var mediaOptions = function(audio, video) {
    return {
        media: {
            constraints: {
                audio: audio,
                video: video
            },
            render: {
                remote: document.getElementById('remoteAudio'),
                local: null
            }
        }
    };
}

var mediaConstraints = {
    audio: true,
    video: false
};

function setMediaOptions() {
    options = mediaOptions(mediaConstraints.audio, mediaConstraints.video);
    options['media']['stream'] = mediaStream;

    return options;
}

function setupMediaStream() {
    if (mediaStream) {
        getUserMediaSuccess(mediaStream);
    } else {
        SIP.WebRTC.getUserMedia(mediaConstraints, getUserMediaSuccess, getUserMediaFailure);
    }
}

function getUserMediaSuccess(stream) {
    mediaStream = stream;
}

function getUserMediaFailure(e) {
    console.error('getUserMedia failed:', e);
}

function sessionEvent(session) {
    session.on('failed', function(response, cause) {

        phone.activeUUID = session.uuid;

        if (typeof data !== 'object' && response == null) {
            printDebug("Warning: This failed is not supported!");
            printDebug(response);
            printDebug(cause);
            return;
        }

        switch (cause) {
            case SIP.C.causes.SIP_FAILURE_CODE:
                printDebug('Cancel call terminated by a BYE: ' + cause);
                break;
            case SIP.C.causes.NOT_FOUND:
                alert("Sorry, it's not possible to call this number...");
                break;
            case SIP.C.causes.REJECTED:
                alert("Call rejected...");
                break;
            case SIP.C.causes.UNAVAILABLE:
                alert("There is an error: " + response.reason_phrase);
                break;
            case SIP.C.causes.INCOMPATIBLE_SDP:
                alert("There is an error: " + response.reason_phrase);
                break;
            case SIP.C.causes.AUTHENTICATION_ERROR:
                alert("Authentification failed");
                break;
            case SIP.C.causes.BUSY:
                alert("Busy...");
                break;
            case SIP.C.causes.TEMPORARILY_UNAVAILABLE:
                phone.stopsound();
                break;
            default:
                switch(response.status_code) {
                    case 200:
                        printDebug("200 OK")
                        break;
                    default:
                        printDebug(response);
                        printDebug(cause);
                        phone.writestatus(cause, "FAILURE");
                        phone.stopsound();
                        phone.transition('failed');
                }
        }
    });

    session.on('progress', function(response) {
        switch(response.status_code) {
            case 180:
                phone.playsound('sounds/progress.wav');
                phone.transition("onprogress", session);
                break;
            case 100:
                phone.transition("onprogress", session);
                break;
            default:
                printDebug("Unknown progress: " + response.status_code);
        }
    });

    session.on('rejected', function(data) {
        phone.activeUUID = session.uuid;
        printDebug("Call rejected...");
    });

    session.on('accepted', function(data) {
        oldActiveCall = phone.activeUUID;
        phone.activeUUID = session.uuid;

        if (oldActiveCall && oldActiveCall != session.uuid) {
            phone.sessions[oldActiveCall].hold();
            removeCounter(phone.sessions[oldActiveCall]);
            printActiveCall(phone.sessions[oldActiveCall]);
        }
        phone.transition("oncall", session);
    });

    session.on('cancel', function () {
        phone.stopsound();
    });

    session.on('bye', function () {
        phone.transition("bye");
    });

    session.on('terminated', function() {
        phone.transition("terminated");
    });

}

function phoneEvent() {
    ua.on('connected', function() {
        phone.transition("connected");
    });

    ua.on('registered', function() {
        if (! phone.isRegistered) {
            phone.transition("registered");
        }
    });

    ua.on('registrationFailed', function() {
        phone.transition("unregistered");
    });

    ua.on('disconnected', function() {
        phone.transition("disconnected");
    });

    ua.on('unregistered', function() {
        phone.transition("unregistered");
    });

    ua.on('invite', function(newSession) {
        uuid = create_uuid();
        newSession.timerId = [];
        newSession.uuid = uuid;
        phone.sessions[uuid] = newSession;
        sessionEvent(newSession);
        phone.incomingcall(newSession);
    });

    phone.on("actions", function(data) {
        $('#'+data.button).val(data.next);
        if (data.active == false) {
            $('#'+data.button+' i').addClass('btn-warning');
        } else {
            $('#'+data.button+' i').removeClass('btn-warning').val(data.next);
        }
    });
}

function printActiveCall(session) {
    if ($('#openmenuactive').length == 0) {
        openmenu = $('<span>', {
            id: 'openmenuactive',
            class: 'pull-right-container'
        }).append($('<i>', {
                class: 'fa fa-angle-left pull-right'
            }));
        openmenu.insertAfter('#myline_display');
    }

    caller = session.remoteIdentity.displayName || session.remoteIdentity.uri.user;
    if(session.startTime) {
        caller += '&nbsp; - &nbsp;';
    }

    classactive = '';
    if (phone.activeUUID == session.uuid) {
        classactive = 'active';
    }

    classline = 'volume-up';
    if (session.local_hold == true || session.remote_hold == true) {
        classline = 'pause';
    }

    if (session.direction == 'incoming') { classdirection = 'left'; }
    if (session.direction == 'outgoing') { classdirection = 'right'; }

    $('#' + session.uuid).remove();
    line = $('<li>', { id: session.uuid, class: classactive})
        .append($('<a>', {id: 'line-' + session.uuid})
            .append($('<i>', { class: 'fa fa-' + classline}))
            .append($('<i>', { class: 'fa fa-chevron-' + classdirection}))
            .append(caller));
    $('#activeline').append(line);

    if(session.startTime) {
        linecounter = $('<strong>', { id: 'linecounter-' + session.uuid });
        timerId = printCounter(linecounter, 'linecounter-' + session.uuid, '#' + session.uuid + ' a', session.startTime);
        session.timerId.push(timerId);
    }

    $('#' + session.uuid).on('click', function() {
        printDebug("click on new line: " + session.uuid);
        oldSession = phone.sessions[findActiveCall()];
        if (! oldSession && phone.compositeState() == "oncall") { return; }
        setActiveCall(session);
        if (oldSession && oldSession.uuid != session.uuid) {
            oldSession.hold();
            removeCounter(oldSession);
            printActiveCall(oldSession);
        }
        updateScreenCallerID(session, session.direction);
        switch(session.direction) {
            case 'incoming':
            case 'outgoing':
                phone.transition("oncall", session);
                break;
            default:
                phone.transition("ready");
        }
    });
}

function findActiveCall() {
    activeline = false;
    try {
        activeline = $('#activeline .active')[0].id;
    }
    catch(e) {
        printDebug('No active line');
    }
    return activeline;
}

function setActiveCall(session) {
    phone.activeUUID = session.uuid;
    if (session.isOnHold().local == true) {
        session.unhold();
    }
    $('#activeline').find('li').removeClass('active');
    $('#' + session.uuid).addClass('active');
}

function removeActiveCall(activeUUID, isEmptyLine) {
    $('#' + activeUUID).remove();
    if (isEmptyLine) {
        $('#openmenuactive').remove();
    }
}

function addOneCall() {
    createButton('addonecall', 'person_add', 'inputnumber');

    $('#addonecall').off().on('click', function () {
        phone.transition("newcall");
    });
}

function addMute() {
    createButton('mute', 'mic', 'phoneaction');

    $('#mute').off().on('click', function () {
        mute = $('#mute').val();
        if (mute == "unmute") {
            phone.handle("unmute");
        } else {
            phone.handle("mute");
        }
    });
}

function addHold() {
    createButton('hold', 'pause', 'phoneaction');

    $('#hold').off().on('click', function () {
        session = phone.sessions[phone.activeUUID];
        if (session.isOnHold().local) {
            phone.handle("unhold");
        } else {
            phone.handle("hold");
        }
        printActiveCall(session);
    });
}

function addCancel() {
    createButton('cancel', 'clear', 'phoneaction', 'btn-danger');

    $('#cancel').off().on('click', function () {
        phone.transition("canceled");
    });
}

function addAtxCancel() {
    createButton('cancelatxtransfer', 'undo', 'phoneaction');

    $('#cancelatxtransfer').off().on('click', function () {
        session_transfer.cancel();
        phone.sessions[phone.activeUUID].unhold();
        phone.handle("unhold");
        phone.transition("oncall", phone.sessions[phone.activeUUID]);
    });
}

function addAtxEnd() {
    createButton('endatxtransfer', 'redo', 'phoneaction');

    $('#endatxtransfer').off().on('click', function () {
        phone.sessions[phone.activeUUID].unhold();
        phone.handle("unhold");
        phone.sessions[phone.activeUUID].refer(session_transfer);
        phone.handle("hangup");
        phone.transition("terminated");
    });
}

function addHangup() {
    createButton('hangup', 'call_end', 'inputnumber', 'btn-danger');

    $('#hangup').click(function () {
        phone.handle("hangup");
    });
}

function addReject() {
    createButton('reject', 'block', 'phoneaction', 'btn-danger');

    $('#reject').off().on('click', function () {
        phone.handle("reject");
    });
}

function addAnswer(session) {
    createButton('answer', 'phone', 'phoneaction');

    $('#answer').off().on('click', function () {
        phone.stopsound();
        phone.handle("answer", session);
    });
}

function addCall() {
    createButton('call', 'call', 'inputnumber');

    $('#inputnumber').keypress(function(event) {
        if (event.which == 13) {
            doCall();
        }
    });

    $('#call').off().on('click', function () {
        doCall();
    });
}

function addVolume() {
    volumecontainer = $('<div>', { class: 'col-lg-6 col-lg-offset-3' })
    .append($('<div>', { class: 'col-lg-4' })
        .append($('<button>')
            .append($('<i>', {'class': "material-icons btn btn-primary btn-xs", 'text': 'equalizer'}))))
    .append($('<div>', { id: 'volumecontainer', class: 'col-lg-6' })
        .append($('<div>', { id: 'volume' })));

    $('#phoneactionvolume').append(volumecontainer);

    $("#volume").slider({
        min  : 0,
        max  : 10,
        value: document.getElementById('remoteAudio').volume * 100,
        orientation: 'horizontal',
        reversed: false,
        tooltip_position:'left'
    });

    $("#volume").on('change', function(e) {
        v = e.value.newValue / 10;
        document.getElementById('remoteAudio').volume = v;
    });
}

function addForward() {
    createButton('transfer', 'phone_forwarded', 'phoneaction');

    $('#transfer').off().on('click', function () {
        phone.sessions[phone.activeUUID].hold();
        phone.handle("hold");
        var target = prompt($.t('app.box.phone.number_transfer'), "");
        phone.sessions[phone.activeUUID].unhold();
        phone.handle("unhold");
        if (target) {
            phone.sessions[phone.activeUUID].refer(target);
            if (phone.cti != true) {
                phone.handle("hangup");
            }
        }
    });

}

function addAtxfer() {
    createButton('atxtransfer', 'shuffle', 'phoneaction');

    $('#atxtransfer').off().on('click', function () {
        phone.sessions[phone.activeUUID].hold();
        phone.handle("hold");
        var target = prompt($.t('app.box.phone.number_transfer'), "");
        if (target) {
            session_transfer = phone.makecall(target);
            phone.handle("atxfer");
            phone.writestatus($.t('app.box.phone.atxfer'), target);
        } else {
            phone.sessions[phone.activeUUID].unhold();
            phone.handle("unhold");
        }
    });
}

function createButton(action, icon, elem, btnclass) {
    btnclass = btnclass || "";
    $('<button>', {'id': action})
        .append($('<i>', {'class': "material-icons btn btn-primary " + btnclass,
                          'text': icon}))
        .appendTo('#'+elem);
}

function addDialer() {
    $('#dialpad').removeClass('hidden').appendTo($('#phoneaction'));

    $('#dialpad .dropdown-menu').click(function(e) {
        e.stopPropagation();
    });

    $('.digit').off().on('click', function(e) {
        e.preventDefault();
        digit = $(this).data('digit');
        dtmfOrDigits(digit)
    });
}

var doCall = function() {
    number = $('#number').val();

    var re = /^\+?[0-9#*]+$/;
    if (re.exec(number) != null && $.isEmptyObject(phone.sessions[phone.activeUUID])) {
        printDebug("Calling " + number);
        phone.makecall(number);
    }
}

function dtmfOrDigits(number) {
    dialer = $('#number');
    dialer.val(dialer.val() + number);
    if (! $.isEmptyObject(phone.sessions[phone.activeUUID])) {
        phone.sessions[phone.activeUUID].dtmf(number);
    }
}

function create_uuid() {
    return machina.utils.createUUID()
}

var phone = new machina.Fsm({
    initialize: function(options) {
        printDebug("FSM: Init");
    },
    initialState: "unauthenticated",
    namespace: "phone",
    sessions: {},
    activeUUID: null,
    cti: false,
    isRegistered: false,
    isAlreadyAuthenticated: false,
    states: {
        unauthenticated: {
           _onEnter: function() {
             debug = ctxStorage.getItem("debug") || false;
             language = initI18n();
             i18next.use(i18nextXHRBackend).init({
               lng: language,
               fallbackLng: 'en',
               whitelist: ['en', 'fr'],
               debug: false,
             }, function() {
               jqueryI18next.init(i18next, $);
               if (ctxStorage.getSession() && getServerIP()) {

                 auth = new XiVOAuth({
                   host: getServerIP(),
                   https_port: setAppPort(),
                   prefix: USING_ONLY_HTTPS
                 });

                 auth.verify_token(ctxStorage.getToken())
                   .done(function(data) {
                     phone.isAlreadyAuthenticated = true;
                     phone.transition("authenticated");
                   })
                   .fail(function(data) {
                     if (data.status == 404) {
                       ctxStorage.removeSession();
                     }
                   });
               } else {
                 printDebug("FSM: Unauthenticate");
                 loadLogin().done(function() {
                   launch_login();
                   $('body').localize();
                 });
               }
             });
           },
           _onExit: function() {
                if (this.isAlreadyAuthenticated == false) {
                    $.backstretch("destroy");
                    $('#auth').remove();
                }
           }
        },
        authenticated: {
           _onEnter: function() {
             printDebug("FSM: Authenticated");
             loadApp()
               .done(function() {

                 options = {
                   host: getServerIP(),
                   token: ctxStorage.getSession().token,
                   https_port: setAppPort(),
                   prefix: USING_ONLY_HTTPS
                 }
                 confd = new XiVOConfd(options);
                 dird = new XiVODird(options);
                 cc = new XiVOCallControl(options);
                 agentd = new XiVOAgentd(options);

                 setupReload();
                 launch_application();
                 $('body').localize();
               });
           },
        },
        unregistered: {
            _onEnter: function() {
                printDebug("FSM: Unregistered");
                phone.clearstatus();
                $('#webrtcstatus').find('i').css('color', 'red');
            }
        },
        registered: {
            _onEnter: function() {
                this.isRegistered = true;
                printDebug("FSM: Registered");
                addNotification();
                addSessionCounter();
                searchContact();
                addContact();
                ctxFavorites.get();
                if (phone.cti == true) {
                    $('#webrtcstatus').remove();
                } else {
                    $('#webrtcstatus').find('i').css('color', 'green');
                }
                this.transition("ready");
            }
        },
        connected: {
            _onEnter: function() {
                printDebug("FSM: Connected");
                $('#webrtcstatus').find('i').css('color', 'green');
                this.transition("ready");
            }
        },
        disconnected: {
            _onEnter: function() {
                printDebug("FSM: Disconnected");
                $('#webrtcstatus').find('i').css('color', 'red');
            }
        },
        newcall: {
            _onEnter: function() {
                printDebug("FSM: New Call");
                session = this.sessions[this.activeUUID];
                session.hold();
                phone.activeUUID = null;
                this.clearstatus();
                addCall();
                printActiveCall(session);
            }
        },
        ready: {
            _onEnter: function() {
                printDebug("FSM: Ready");
                activeUUID = findActiveCall();
                if ($.isEmptyObject(this.sessions[activeUUID])) {
                    this.clearstatus();
                    addCall();
                } else {
                    switch(phone.sessions[this.activeUUID].status) {
                        case 'ring':
                            this.transition("onincomingcall", this.sessions[this.activeUUID]);
                            break;
                        case 'ringing':
                            this.transition("onoutgoingcall", this.sessions[this.activeUUID]);
                            break;
                        case 12:
                        case 'oncall':
                            this.transition("oncall", this.sessions[this.activeUUID]);
                            break;
                        default:
                            printDebug("Unknow call status: " + this.sessions[this.activeUUID].status);
                    }
                }
            }
        },
        oncall: {
            _onEnter: function(session) {
                printDebug("FSM: On call");
                if (session.direction == "incoming") {
                    printDebug("Session is incoming call!");
                }
                addHangup();
                addForward();
                if (this.cti != true) {
                    addMute();
                    addHold();
                    addDialer();
                    addOneCall();
                    addVolume();
                    if (session.startTime == null) {
                        session.startTime = moment()._d;
                    }
                }

                updateScreenCallerID(session, this.compositeState());
                this.stopsound();
                removeButton(['call', 'cancel', 'reject', 'answer', 'endatxtransfer', 'cancelatxtransfer']);
            },
            hangup: function() {
                printDebug("FSM: Hangup");
                this.sessions[this.activeUUID].bye();
            },
            mute: function() {
                printDebug("FSM: Mute");
                this.sessions[this.activeUUID].mute();
                this.emit("actions", {button: "mute", active: false, next: "unmute"});
            },
            unmute: function() {
                printDebug("FSM: Unmute");
                this.sessions[this.activeUUID].unmute();
                this.emit("actions", {button: "mute", active: true, next: "mute"});
            },
            hold: function() {
                printDebug("FSM: Hold");
                this.sessions[this.activeUUID].hold();
                this.emit("actions", {button: "hold", active: false, next: "unhold"});
            },
            unhold: function() {
                printDebug("FSM: Unhold");
                this.sessions[this.activeUUID].unhold();
                this.emit("actions", {button: "hold", active: true, next: "hold"});
            },
            _onExit: function() {
                printDebug("FSM: Exit oncall");
                this.clearstatus();
            }
        },
        onprogress: {
            _onEnter: function(session) {
                printDebug("FSM: On progress");
                addCancel();
                updateScreenCallerID(session, this.compositeState());
                removeButton(['call', 'reject', 'answer']);
            },
            _onExit: function() {
                this.clearstatus();
            }
        },
        onincomingcall: {
            _onEnter: function(newSession) {
                printDebug("FSM: On incoming call");
                newSession.direction = "incoming";
                activeUUID = findActiveCall();
                if (activeUUID == false) {
                    phone.activeUUID = newSession.uuid;
                }
                ctxStorage.storeCallLog(newSession, this.compositeState());
                updateScreenCallerID(newSession, this.compositeState());

                if (this.cti != true) {
                    addAnswer(newSession);
                    this.playsound('sounds/ring.wav');
                }
                addReject();
                removeButton(['call']);
            },
            answer: function(session) {
                session.accept(setMediaOptions());
                removeButton(['call', 'cancel', 'reject', 'answer', 'endatxtransfer', 'cancelatxtransfer']);
            },
            reject: function() {
                this.sessions[this.activeUUID].reject();
                this.stopsound();
                this.transition("rejected");
            },
            _onExit: function() {
                this.clearstatus();
            }
        },
        onoutgoingcall: {
            _onEnter: function(session) {
                printDebug("FSM: On outgoing call");
                session.direction = "outgoing";
                session.timerId = [];
                ctxStorage.storeCallLog(session, this.compositeState());
            },
            atxfer: function() {
                printDebug("FSM: Atxfer");
                addAtxCancel();
                addAtxEnd();
            },
            _onExit: function() {
                this.clearstatus();
            }
        },
        rejected: {
            _onEnter: function() {
                printDebug("FSM: Rejected");
            }
        },
        canceled: {
            _onEnter: function() {
                printDebug("FSM: Canceled");
                this.sessions[this.activeUUID].cancel();
            }
        },
        bye: {
            _onEnter: function() {
                printDebug("FSM: Bye");
            }
        },
        failed: {
            _onEnter: function() {
                printDebug("FSM: Failed");
                cleanKeys();
                this.transition("terminated");
            }
        },
        terminated: {
            _onEnter: function() {
                printDebug("FSM: Terminated");
                if ($.isEmptyObject(this.sessions)) {
                    this.transition("ready");
                    return;
                }
                if (this.activeUUID) {
                    ctxStorage.storeCallLog(this.sessions[this.activeUUID], this.compositeState());
                    removeCounter(this.sessions[this.activeUUID]);
                    delete this.sessions[this.activeUUID];
                    removeActiveCall(this.activeUUID, $.isEmptyObject(this.sessions));
                    this.activeUUID = null;
                }

                if (! $.isEmptyObject(this.sessions)) {
                    var activeUUID;
                    $.each(this.sessions, function(key, value) {
                        activeUUID = key;
                    });
                    this.activeUUID = activeUUID; 
                }
                this.transition("ready");
            }
        }
    },
    register: function(config) {
        if (this.cti != true) {
            ua = createUA(config);
            phoneEvent();
            setupMediaStream();
        } else {
            ua = createUACTI();
        }
    },
    clearstatus: function() {
        cleanKeys();
        $('#calluser').empty();
        $('#callinfo').empty();
        $('#calltime').remove();
        $('#number').val('');
    },
    writestatus: function(info, user) {
        if ($('#calluser').html() == '') {
            $('#calluser').append(user);
        }
        if ($('#callinfo').html() == '') {
            $('#callinfo').append(info);
        }
    },
    playsound: function(sound) {
        $('<audio>', {
             'autoplay': 'autoplay',
             'loop': true,
             'src': sound
        }).appendTo('#ring');
    },
    stopsound: function() {
        setTimeout(function() {
            sound = $('#ring');
            sound.stop();
            sound.empty();
        }, 50);
    },
    incomingcall: function(newSession) {
        this.transition("onincomingcall", newSession);

    },
    events: function(events) {
        xivoEvents(events);
    },
    makecall: function(uri) {
        if (this.cti != true) {
            uuid = create_uuid();
            this.activeUUID = uuid;
            this.sessions[uuid] = ua.invite(uri, setMediaOptions());
            this.sessions[uuid].uuid = uuid;
            this.transition("onoutgoingcall", this.sessions[uuid]);
            sessionEvent(this.sessions[uuid]);
        } else {
            ua.invite(uri);
        }
    }
});

function updateScreenCallerID(session, direction) {
    callerIdName = session.remoteIdentity.displayName || session.remoteIdentity.uri.user
    if (callerIdName != session.remoteIdentity.uri.user) {
        callerIdName = callerIdName + " <" + session.remoteIdentity.uri.user + ">";
    }

    removeCounter(session);
    $('#calluser').empty();
    $('#callinfo').empty();
    $('#calltime').remove();
    if (session.startTime) {
        c1 = $('<h5>', { class: 'widget-user-desc', id: "calltime" });
        datetime = session.startTime;
        timerId = printCounter(c1, "calltime", ".widget-user-header", datetime);
        session.timerId.push(timerId);
    }

    printActiveCall(session);
    switch(direction) {
        case 'onincomingcall':
            phone.writestatus($.t('app.box.phone.incoming_call'), callerIdName);
            sendNotification($.t('app.box.phone.incoming_call'), callerIdName);
            break;
        case 'oncall':
            phone.writestatus($.t('app.box.phone.on_call'), callerIdName);
            break;
        case 'onoutgoingcall':
            phone.writestatus($.t('app.box.phone.calling'), callerIdName);
            break;
        case 'onprogress':
            phone.writestatus($.t('app.box.phone.calling'), callerIdName);
            break;
    }
}

function removeButton(buttons) {
    for (b = 0; b < buttons.length; b++) {
        $('#'+buttons[b]).remove();
    }
}

function cleanKeys() {
    $('#call').remove();
    $('#hangup').remove();
    $('#addonecall').remove();
    $('#cancel').remove();
    $('#answer').remove();
    $('#reject').remove();
    $('#mute').remove();
    $('#hold').remove();
    $('#transfer').remove();
    $('#atxtransfer').remove();
    $('#endatxtransfer').remove();
    $('#cancelatxtransfer').remove();
    $('#phoneactionvolume').empty();
    $('#dialpad').addClass('hidden');
}

function setupReload() {
    window.onbeforeunload = function() {
        ua.unregister();
        ua.stop();
        printDebug("BYE BYE");
    };

}

function loadPhone(data) {
    if (checkWebRTCConfig(data) == true) {
        if (SIP.WebRTC.isSupported()) {
            phone.cti = false;
            phone.register(getPhoneConfig(data));
        } else {
            printDebug("Please update your browser to support WEBRTC!");
        }
    } else {
         printDebug("Switch to CTI, webrtc is not configured on your PBX");
         loadPhoneCTI();
    }
}

function checkWebRTCConfig(data) {
    var check = false;
    $.each(data.options, function(key, value) {
        if (value[0] == 'avpf') {
            if (value[1] == 'yes') {
                check = true;
            }
        }
    });

    return check;
}

function checkIfPrivateIP(ip) {
    stun = ["stun:null"]
    re = /^(?:10|127|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\..*/;
    if (re.exec(ip) == null) {
        stun = ["stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302"
        ];

    }
    return stun;
}

function getPhoneConfig(data) {
    server = getServerIP();
    return config = {
      traceSip: false,
      displayName: displayname,
      uri: data.username+'@'+server,
      wsServers: ctxStorage.getServer("asterisk"),
      authorizationUser: data.username,
      password: data.secret,
      hackIpInContact: true,
      hackWssInTransport: true,
      iceCheckingTimeout: 50,
      rtcpMuxPolicy: 'negotiate', // only to support old asterisk version < 14.4.0, on the new version we need to use rtcp_mux setted to yes
      stunServers: checkIfPrivateIP(server),
      log: { builtinEnabled: false }
    };

}

function loadLines(data) {
    $('#myline_display').append(displayname);
    $('#myline').removeClass('hidden');

    if (data.lines) {
        if (data.lines.length > 1) {
            var lines = [{
                text: $.t('app.box.lines.choose'),
                value: ''
            }]

            $.each(data.lines, function(key, value) {
                l = parseInt(key);
                l += 1;
                lines.push({
                    text: $.t('app.box.lines.line') +' ' + l,
                    value: value.id
                });
            });
            bootbox.prompt({
                title: $.t('app.box.lines.message'),
                inputType: 'select',
                inputOptions: lines,
                buttons: {
                  confirm: {
                    label: $.t('app.box.lines.confirm')
                  },
                  cancel: {
                    label: $.t('app.box.lines.cancel')
                  }
                },
                callback: function (line_id) {
                    if (line_id == null) {
                        line_id = data.lines[0].id;
                    }
                    configureLine(line_id);
                }
            });
        } else {
            configureLine(data.lines[0].id);
        }
    } else {
        confd.get_user_associated_line(ctxStorage.getUuid())
            .done(function(data) {
                loadPhone(data)
                printCallLogs();
            })
            .fail(loadPhoneCTI);
        confd.get_user_lines(ctxStorage.getUuid())
          .done(getUserMainLine);
    }

}

function configureLine(line_id) {
    setUserMainLine(line_id);
    confd.get_user_line_configuration(ctxStorage.getUuid(), line_id)
        .done(function(data) {
            loadPhone(data)
            printCallLogs();
        })
        .fail(loadPhoneCTI);
}

function loadUser(data) {
    displayname = '';
    extension = '';

    if (data.firstname) {
        displayname = data.firstname;
    }
    if (data.lastname) {
        displayname = displayname + ' ' + data.lastname; 
    }

    display_usersidebar = displayname;
    if (data.lines) {
        $.each(data.lines, function(key, value) {
             extension = value.extensions[0].exten;
             context = value.extensions[0].context;
             display_usersidebar = displayname + ' - ' + extension;
        });
    }

    user = {
        firstname: data.firstname,
        lastname: data.lastname,
        displayname: displayname,
        extension: extension,
        context: context,
        agent: data.agent
    }
    ctxStorage.storeUser(user);

    displayprofile = displayname + ' - ' + user.extension;
    $('#user').append(displayname);
    $('#usersidebar').append(display_usersidebar);
    $('#userprofile').append(displayprofile);
}

function signIn(data) {
    ctxStorage.storeSession(data.data);
    phone.transition("authenticated");
}

var addNotification = function() {
    Notification.requestPermission( function(status) {
        if (Notification.permission !== status) {
            Notification.permission = status;
        }
    });
}

var sendNotification = function(title, body) {
    n = new Notification(title, {body: body});
    n.onshow = function () { 
        setTimeout(n.close.bind(n), 5000); 
    }
}

var logoutAction = function(ws) {
    var ws = ws;
    $('#logout').off().on('click', function(e) {
        e.preventDefault();
        try {
            ua.stop();
        } catch (e) {}
        logout(ws);
    });
}

var logout = function(ws) {
    if (ws) {
        ws.close();
    }
    cc.update_my_user_presence('disconnected')
      .done(function() {
        auth.logout(ctxStorage.getToken())
          .done(ctxStorage.removeSession());
      })
      .fail(function() {
        ctxStorage.removeSession();
        printDebug('Looks like a problem to change your presence to disconnected...');
      });
}

var printCounter = function(widget, elem, elemTo, datetime) {
    widget.appendTo(elemTo);
    return addCounter(elem, datetime);
}

var addCounter = function(elem, datetime) {
    return countdown(new Date(datetime),
              function(ts) {
                   $('[id="'+ elem + '"]').html(formatSessionTime(ts));
               },
               countdown.HOURS | countdown.MINUTES | countdown.SECONDS);
}

var removeCounter = function(session) {
    $.each(session.timerId, function(key, timer) {
        window.clearInterval(timer);
    });
    session.timerId = [];
    $('#calltime').remove();
}


function addSessionCounter() {
    datetime = moment(ctxStorage.getSession().expires_at).local().format();
    c2 = $('<small>', { html: $.t('app.profile.session_expires') + ' <span id="expiration"></span> min.' });
    printCounter(c2, 'expiration', '#userprofile', datetime);
}

var formatSessionTime = function(ts) {
    s = '';

    if (ts.hours)
        s += addZero(ts.hours)+':';

    s += addZero(ts.minutes) + ':' + addZero(ts.seconds);

    return s
}

var addZero = function(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

var startLogoutTimer = function() {
    setTimeout(LogoutTimeout, getExpirationTime());
}

var LogoutTimeout = function() {
    printDebug("Auto logout");
    logout();
}

var getExpirationTime = function() {
    expiration = moment(ctxStorage.getSession().expires_at);
    time_now = moment().utc();
    return expiration.diff(time_now + 1000);
}

var get_query_server_ip = function() {
    var urlParams;
    (window.onpopstate = function () {
        var match,
            pl     = /\+/g,
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
            query  = window.location.search.substring(1);

        urlParams = {};
        while (match = search.exec(query))
            urlParams[decode(match[1])] = decode(match[2]);
    })();

    return urlParams;
}

var signInError = function(data) {
    $('#error').html('').removeClass('hidden');

    printDebug("Authentification failed!");

    $('<p>', {
        'class': 'text-left',
        'html': '<strong>Error:</strong> '+ data.status +'<br><strong>Message:</strong>' + data.statusText,
    }).appendTo('#error');

    if (data.status == 0) {
        printDebug("Please check your wazo server access!");
        port = auth.port;
        if (USING_ONLY_HTTPS) {
            port = auth.https_port;
        }
        $('<p>', {
            'class': 'text-left',
            'html': '<strong>Important:</strong> Please click on this <strong><a href="https://' +
                    auth.host + ':' + port + '" target="_blank">link</a></strong> to check your service!</p>'
        }).appendTo('#error');
    }
}

var launch_application = function() {
    printDebug("Launch application");

    ws = launch_ws();
    startLogoutTimer();
    logoutAction(ws);
    checkVersion();
    confd.get_user(ctxStorage.getUuid())
        .done(function(data) {
          loadUser(data);
          loadUserSettings(data);
          loadLines(data);
          if (data.voicemail) {
              loadVoicemails();
          }
          if (data.agent) {
              loadAgent(data.agent);
          }
          loadFuncKeys();
        })
        .fail(printDebug);
}

function getServerIP() {
    var server;

    urlParams = get_query_server_ip();
    server = ctxStorage.getItem("server");
    if ("serverIP" in urlParams) {
        server = urlParams.serverIP;
    }

    return server;
}

function getBackend() {
    var backend;

    urlParams = get_query_server_ip();
    backend = ctxStorage.getItem("backend");
    if ("backend" in urlParams) {
        backend = urlParams.backend;
        ctxStorage.store('backend', backend);
    }

    return backend;
}

function getServerPort() {
    var port;

    urlParams = get_query_server_ip();
    port = ctxStorage.getItem("port");
    if ("port" in urlParams) {
        port = urlParams.port;
        ctxStorage.store('port', port);
    }

    return port;
}

function getAgentExtension() {
    var extension;

    urlParams = get_query_server_ip();
    extension = ctxStorage.getItem("agent_extension");
    if ("agent_extension" in urlParams) {
        extension = urlParams.agent_extension;
        ctxStorage.store('agent_extension', extension);
    }

    return extension;
}

function setAppPort() {
    USING_ONLY_HTTPS = true;
    port = getServerPort();
    if (port == 9486 || port == '' || port == null) {
        USING_ONLY_HTTPS = false;
        port = 9486;
    }

    return port;
}

var launch_login = function() {
    $.backstretch(background_login, {centeredY: false});

    eventLogin();
    eventLoginConfiguration();
}

function eventLogin() {
    $('#signin').on('click', function(e) {
        e.preventDefault();

        auth = new XiVOAuth({
          host: getServerIP(),
          https_port: setAppPort(),
          prefix: USING_ONLY_HTTPS
        });

        auth.login({
          username: $('#username').val(),
          password: $('#password').val(),
          backend: getBackend() || 'xivo_user',
          expiration: 12 * 60 * 60
        })
          .done(signIn)
          .fail(signInError);
    });
}

function eventLoginConfiguration() {
    var links = [
      {
        "bgcolor":"#3c8dbc",
        "icon":"<i class='fa fa-gears'></i>"
      },
      {
         "bgcolor":"#f1c40f",
         "target": "pouet",
         "color":"fffff",
         "icon":"<i class='fa fa-pencil'></i>"
       },
       {
         "url":"http://wazo.community",
         "bgcolor":"#e74c3c",
         "color":"#fffff",
         "icon":"W",
         "target":"_blank"
       }
     ];

     var options = {
       rotate: false
     };

     $('#configuration').jqueryFab(links, options);

     $('[data-link-target=pouet]').on('mousedown', function() {
         configuration();
     });
}

function configuration() {
    $('#view-configuration').modal('show');

    server = ctxStorage.getItem('server');
    port = ctxStorage.getItem('port');
    backend = ctxStorage.getItem('backend');
    extension = ctxStorage.getItem('agent_extension');
    debug = ctxStorage.getItem('debug');
    if (debug == 'true') {
        debug = true;
    } else {
        debug = false;
    }

    $('#server').val(server);
    $('#port').val(port);
    $('#backend').val(backend);
    $('#agent_extension').val(extension);
    $('#debug').prop("checked", debug);

    save_configuration();
}

function save_configuration() {
    $('#post-configuration').on('click', function() {
        $('#view-configuration').modal('hide');

        server = $('#server').val();
        port = $('#port').val();
        backend = $('#backend').val();
        extension = $('#agent_extension').val();
        debug = $('#debug').prop("checked");

        ctxStorage.store('server', server);
        ctxStorage.store('port', port);
        ctxStorage.store('backend', backend);
        ctxStorage.store('agent_extension', extension);
        ctxStorage.store('debug', debug);
    });
}

var searchContact = function() {

    $('#formSearch').on('submit', function(e) {
        e.preventDefault();
        search();
        $('#searchviainput').val('');
    });

    $('#searchcontact').keypress(function(event) {
        if (event.which == 13) {
            search();
        }
    });

    $('#search').click(function () {
        search();
    });

    var search = function() {
        contact = $('#searchcontact').val() || $('#searchviainput').val();
        if (contact != '') {
            $('#contact-box').slimScroll({
                height: '250px'
            });

            ctxFavorites.lookup(contact);
        }
    }
}

var addContact = function() {
    $('#post-contact').on('click', function(e) {
        e.preventDefault();
        firstname = $('#firstname').val();
        lastname = $('#lastname').val();
        phonenumber = $('#phonenumber').val();
        $('#view-add-contact').modal('hide');

        if (firstname && $.isNumeric(phonenumber)) {
            contact = {
                'firstname': firstname,
                'lastname': lastname,
                'number': phonenumber
            }
            ctxFavorites.create_personal(contact);
        } else {
            alert("There is some problem to add your user, please review your form!");
        }
    });
}

var getUserUUIDPresence = function(xivo_uuid, uuid) {
    if (xivo_uuid && uuid) {
        return cc.get_user_presence(uuid, xivo_uuid);
    }
    return null;
}

var getContacts = function(data) {
    contacts = [];
    col_name = data.column_types.indexOf('name');
    col_favorite = data.column_types.indexOf('favorite');
    col_number = data.column_types.indexOf('number');
    col_personal = data.column_types.indexOf('personal');

    $.each(data, function(key, value) {
        if (key == "results") {
            $.each(value, function(key, value) {
                if(value.column_values[col_number] == null) {
                    return;
                }

                contacts.push(pushContact(value));
            });
        }
    });

    return orderFavoritesByName(contacts);

}

function orderFavoritesByName(contacts) {
    byName = contacts.slice(0);
    byName.sort(function(a,b) {
        var x = a.name.toLowerCase();
        var y = b.name.toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
    });

    return byName;
}

var pushContact = function(value) {
    contact = {
        name: value.column_values[col_name],
        number: value.column_values[col_number],
        favorite: value.column_values[col_favorite],
        user_id: value.relations.user_id,
        user_uuid: value.relations.user_uuid,
        xivo_uuid: value.relations.xivo_id,
        endpoint_id: value.relations.endpoint_id,
        source: value.source,
        source_entry_id: value.relations.source_entry_id,
        presence: null,
        personal: value.column_values[col_personal]
    };

    return contact;
}

var printFavorites = function(data) {
    contacts = getContacts(data);
    $.each(contacts, function(key, value) {
        printFavorite(value);
    });
}

var printFavorite = function(value) {
    endpoint = value.endpoint_id ? 'endpoint_id-'+ value.xivo_uuid + '-' + value.endpoint_id : 'no_endpoint';
    userclass = value.endpoint_id ? 'treeview active' : '';
    favoriteicon = value.endpoint_id ? 'fa-user' : 'fa-phone';

    actions = $('<i>', {
      'class': 'fa fa-star pull-right',
      'id': 'togglefavorite-' + value.source + '-' + value.source_entry_id
    });

    favorite = $('<li>', {'class': userclass + ' ' + 'favorite-' + value.source + '-' + value.source_entry_id, 'id': endpoint})
                 .append($('<a>', { 'href': '#', 'data-toggle': 'popover', 'data-content': value.number, 'data-trigger': 'hover', 'title': $.t('app.user.call'), 'tabindex': 0, 'role': 'button'})
                   .append($('<i>', {'class': 'fa ' + favoriteicon, 'id': 'presenceuser-' + value.xivo_uuid + '-' + value.user_uuid}))
                   .append($('<span>', {'id': 'callfavorite-' + value.source + '-' + value.number, 'text': value.name}))
                   .append($('<span>', {'id': 'actionsfavorite-' + value.source + '-' + value.source_entry_id, 'class': 'pull-right-container'})
                     .append(actions)))
                 .appendTo($('#favorites'));

    deletefavoritecontact(value.source, value.source_entry_id);
    callfavorite(value.source, value.number);
    addFavoritePresence(value);
    setLineStatus(value.xivo_uuid, value.endpoint_id);
}

function addFavoritePresence(value) {
  if (value.xivo_uuid && value.user_uuid) {
    getUserUUIDPresence(value.xivo_uuid, value.user_uuid)
      .done(function(data) {
        value.presence = data.presence;
        $('#presenceuser-' + value.xivo_uuid + '-' + value.user_uuid)
          .addClass(setColorPresence(value.presence));
        addChatAction(value);
      }).fail(function() {
        printDebug("Your wazo don't support all features, please upgrade it to the latest version!");
        $('#presenceuser-' + value.xivo_uuid + '-' + value.user_uuid)
          .addClass(setColorPresence('no-supported'));
      });
  }
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

var setLineStatus = function(xivo_uuid, endpoint_id) {
    if (xivo_uuid && endpoint_id) {
        if (xivo_uuid == 'me') { xivo_uuid = false; }
        cc.get_line_status(endpoint_id, xivo_uuid)
          .done(function(data) {
            line = {
                'xivo_uuid': data.xivo_uuid,
                'endpoint_id': data.line_id,
                'status': data.presence
            };
            updateLineStatus(line);
          })
          .fail(function() {
            printDebug("Your wazo don't support all features, please upgrade it to the latest version!");
            line = {
                'xivo_uuid': xivo_uuid,
                'endpoint_id': endpoint_id,
                'status': -1
            };
            updateLineStatus(line);
        });
    }
}

var printContacts = function(data) {
    cleanContacts();
    contacts = getContacts(data);
    $.each(contacts, function(key, value) {
        printContact(value);
    });

}

var cleanContacts = function() {
    $('#result-contacts').find('tr').remove();

    $('#clean-contact').on('click', function() {
        $('#result-contacts').find('tr').remove();
        $('#searchcontact').val('');
    });
}

var printContact = function(value) {
    if ($.type(value.presence) === 'object') {
        value.presence.done(function(data) {
            value.presence = data.presence;
            printContact(value);
        }).fail(function() {
            printDebug("Your wazo don't support all features, please upgrade it to the latest version!");
            value.presence = 'no-supported';
            printContact(value);
        });

        return;
    }

    action = $('<td>');
    call = $('<i>', { 'id': 'call-' + value.number,
                      'class': 'fa fa-fw fa-phone'
           }).data('number', value.number)
             .appendTo(action);

    if (value.source_entry_id) {
        favoriteclass = 'fa-star-o';
        if (value.favorite) {
            favoriteclass = 'fa-star';
        }
        favorite = $('<i>', { 'id': 'addfavorite-' + value.source + '-' + value.source_entry_id,
                              'class': 'fa fa-fw ' + favoriteclass});
        favorite.appendTo(action);
    }

    if (value.presence && (value.presence != 'disconnected' && value.presence != 'no-supported')) {
        chat = $('<i>', { 'id': 'chat-' + value.user_uuid,
                          'class': 'fa fa-fw fa-comment-o'
               }).data('user', value.user_uuid)
                 .data('xivo', value.xivo_uuid)
                 .data('alias', value.name);
        chat.appendTo(action);
    }

    if (value.personal) {
        personal = $('<i>', { 'id': 'delpersonal-' + value.source_entry_id,
                              'class': 'fa fa-fw fa-remove'});
        personal.appendTo(action);
    }

    $('#result-contacts').append(createContact(value, action));

    callcontact(value.number);

    if (value.source_entry_id) {
        favoritecontact(value);
    }

    if (value.presence && (value.presence != 'disconnected' && value.presence != 'no-supported')) {
        chatcontact(value);
    }

    if (value.personal) {
        deletepersonalcontact(value.source_entry_id);
    }
}

var deletepersonalcontact = function(id) {
    $('#delpersonal-' + id).on('click', function() {
        ctxFavorites.delete_personal(id);
    });
}

var createContact = function(data, action) {
    return $('<tr>').append($('<td>', { 'html': data.name }))
                    .append($('<td>', { 'html': data.number }))
                    .append(action);
}

var callcontact = function(id) {
    $('#call-' + id).click(function() {
        number = $(this).data('number');
        $('#number').val(number);
        doCall();
    });
}

var favoritecontact = function(value) {
    $('#addfavorite-' + value.source + '-' + value.source_entry_id).click(function() {
        ctxFavorites.add(value);
    });
}

var deletefavoritecontact = function(source, contact_id) {
    $('#togglefavorite-' + source + '-' + contact_id).click(function() {
        ctxFavorites.del(source, contact_id);
    });
}

var callfavorite = function(source, number) {
    $("[data-toggle=popover]").popover();

    $(document.body).on('click', '#callfavorite-' + source + '-' + number, function() {
        $('#number').val(number);
        doCall();
    });
}

var loadUserSettings = function(data) {
    loadUserDND(data);
    loadUserForwards(data);
    loadUserPresence();
    loadUserPassword();
    loadUserEmail(data.email);
    loadUserGravatar(data.email);
    loadUserMobile(data.mobile_phone_number);
}

function loadUserPresence() {
    cc.get_my_user_presence()
        .done(initMyPresence);
}

function loadUserDND(data) {
    if (data.services) {
        printDND(data.services.dnd);
    } else {
        confd.get_user_service_dnd(ctxStorage.getUuid())
          .done(printDND);
    }

    actionDND();
}

function loadUserForwards(data) {
    if (data.forwards) {
        printUForward(data.forwards.unconditional);
        printNAForward(data.forwards.noanswer);
        printBusyForward(data.forwards.busy);
    } else {
        alert("Please upgrade your server to the latest Wazo version!");
        confd.get_user_service_unconditional_forward(ctxStorage.getUuid()).done(printUForward);
        confd.get_user_service_noanswer_forward(ctxStorage.getUuid()).done(printNAForward);
        confd.get_user_service_busy_forward(ctxStorage.getUuid()).done(printBusyForward);
    }

    actionUForward();
    actionNAForward();
    actionBusyForward();
}

var getUserMainLine = function(data) {
    $.each(data['items'], function(key, value) {
        if (value.main_line) {
            setUserMainLine(value.line_id);
            return true;
        }
    });

}

function setUserMainLine(endpoint_id) {
    ctxStorage.storeEndpointId(endpoint_id);
    xivo_uuid = ctxStorage.getSession().xivo_uuid;
    if (xivo_uuid) {
        setLineStatus(xivo_uuid, endpoint_id);
    } else {
        setLineStatus('me', endpoint_id);
    }
    actionChangePresence();
}

var initMyPresence = function(data) {
    ctxStorage.storeXiVOUUID(data.xivo_uuid);
    if (data.presence == 'disconnected') {
        cc.update_my_user_presence(default_presence)
          .done(getUserPresence);
    } else {
        setUserPresence(data);
    }
}

var getUserPresence = function(data) {
    cc.get_my_user_presence()
      .done(setUserPresence);
}

var setUserPresence = function(data) {
    presence = data.presence;
    if (data.status) {
        presence = data.status;
    }
    presenceclass = setColorPresence(presence);
    $('#userpresence').text(' ' + $.t('app.presence.' + presence)).prepend($('<i>', {'class': 'fa fa-circle ' + presenceclass}));
}

var setUserUUIDPresence = function(data) {
    presenceclass = setColorPresence(data.status);
    $('#presenceuser-' + data.xivo_uuid + '-' + data.user_uuid).removeClass().addClass('fa fa-user ' + presenceclass);
    if (data.status == 'disconnected') {
        $('#chat-' + data.user_uuid).removeClass('fa-comment');
    } else {
        if (!$('#chat-' + data.user_uuid).hasClass('fa-comment')) {
            $('#chat-' + data.user_uuid).addClass('fa-comment');
        }
    }
}

var setColorPresence = function(presence) {
    switch(presence) {
        case 'available':
            presenceclass = 'text-green';
            break;
        case 'disconnected':
            presenceclass = 'text-black';
            break;
        case 'donotdisturb':
            presenceclass = 'text-red';
            break;
        case 'no-supported':
            presenceclass = '';
            break;
        case null:
            presenceclass = '';
            break;
        default:
            presenceclass = 'text-yellow';
    }

    return presenceclass;
}

var printDND = function(data) {
    $('#dnd').prop("checked", data.enabled);
}

var printUForward = function(data) {
    if (data.enabled) {
        $('#uforward').val(data.destination);
    } else {
        $('#uforward').val('');
    }
}

var printNAForward = function(data) {
    if (data.enabled) {
        $('#naforward').val(data.destination);
    } else {
        $('#naforward').val('');
    }
}

var printBusyForward = function(data) {
    if (data.enabled) {
        $('#busyforward').val(data.destination);
    } else {
        $('#busyforward').val('');
    }
}

var actionDND = function() {
    $('#dnd').on('click', function() {
        confd.set_user_service_dnd(ctxStorage.getUuid(), this.checked);
    });
}

var actionUForward = function() {
    $('#uforward').on('change', function() {
        var re = /^\+?[0-9#*]+$/;
        if (re.exec(this.value) != null || this.value === '') {
            confd.set_user_service_unconditional_forward(ctxStorage.getUuid(), this.value);
        }
    });
}

var actionNAForward = function() {
    $('#naforward').on('change', function() {
        var re = /^\+?[0-9#*]+$/;
        if (re.exec(this.value) != null || this.value === '') {
            confd.set_user_service_noanswer_forward(ctxStorage.getUuid(), this.value);
        }
    });
}

var actionBusyForward = function() {
    $('#busyforward').on('change', function() {
        var re = /^\+?[0-9#*]+$/;
        if (re.exec(this.value) != null || this.value === '') {
            confd.set_user_service_busy_forward(ctxStorage.getUuid(), this.value);
        }
    });
}

var actionChangePresence = function() {
    $('#changepresence li').on('click', function() {
        cc.update_my_user_presence(this.id)
          .fail(printDebug);
    });
}

var updateLineStatus = function(data) {
    endpoint = '#endpoint_id-' + data.xivo_uuid + '-' + data.endpoint_id;
    if ((data.xivo_uuid == ctxStorage.getSession().xivo_uuid) && data.endpoint_id == ctxStorage.getItem("endpoint_id")) {
      endpoint = '#myline';
    }

    switch (data.status) {
        case -1:
            linecolor = 'gray';
            break
        case 0:
            linecolor = 'green';
            break;
        case 1:
            linecolor = '#dd4b39';
            break;
        case 4:
            linecolor = '#000';
            break;
        case 8:
            linecolor = '#ff851b';
            break;
        case 9:
            linecolor = 'blue';
            break;
        default:
            printDebug('LINESTATUS: ' + data.status);
            linecolor = ''
    }

    $(endpoint + ' a').css('border-left-color', linecolor);
}

var launch_ws = function() {
    var sock = new ReconnectingWebSocket(ctxStorage.getServer("websocketd"));
    sock.debug = false;
    init = 0;

    sock.onopen = function() {
        $('#websocketstatus').find('i').css('color', 'green');
    };
    sock.onmessage = function(e) {
        if (init == 0) {
            wsInit($.parseJSON(e.data), sock);
        } else {
            phone.events($.parseJSON(e.data));
        }
    };
    sock.onclose = function() {
        printDebug('There is a problem with your websocket, please reload your page...');
        init = 0;
        $('#websocketstatus').find('i').css('color', 'red');
    };
    sock.onerror = function (e) {
        //printDebug('Websocket error occured: ' + e.data);
        printDebug('There is a problem with your websocket, please reload your page...');
        init = 0;
        $('#websocketstatus').find('i').css('color', 'red');
    };

    return sock;
}

var wsInit = function(data, sock) {
    switch(data.op) {
        case 'init':
            routingKey = ['*']
            for (i = 0; i < routingKey.length; i++) { 
                op = {'op': 'subscribe', 'data': {event_name: routingKey[i]}}
                sock.send(JSON.stringify(op));
            }
            sock.send(JSON.stringify({'op': 'start'}))
            break;
        case 'subscribe':
            //printDebug('Subscribing successfull!');
            break;
        case 'start':
            init = 1;
            //printDebug('Received message is activated!');
            break;
    }
}

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

function uacti() {
    phone.transition("registered");
    this.invite = function(uri) {
        cc.make_call_me(uri)
            .done(function(data) {
                call = {
                    call_id: data.call_id,
                    peer_caller_id_number: uri,
                    peer_callerid_name: uri,
                    creation_time: moment().format()
                }
                session = createCTISession(call, 'call_created');
                phone.transition("onoutgoingcall", session);
            })
            .fail(function(data) {
                alert("Sorry, it's not possible to call this number...");
                phone.transition("failed");
            });
    }
    this.on = function(session, e) {
        phoneCTIEvent(session, e);
    }
}

function uasession() {
    this.ua = null;
    this.id = null;
    this.direction = null;
    this.status = null;
    this.startTime = null;
    this.talking_to = null;
    this.local_hold = false;
    this.remote_hold = false;

    this.remoteIdentity = {
        displayName: null,
        uri: {
            user: null,
        },
    }
    this.cancel = function() {
        cc.hangup_me(this.id);
    }
    this.bye = function() {
        cc.hangup_me(this.id);
    }
    this.reject = function() {
        cc.hangup_me(this.id);
    }
    this.hold = function() {
        printDebug("Not supported");
    }
    this.mute = function() {
        printDebug("Not supported");
    }
    this.dtmf = function() {
        printDebug("Not supported");
    }
    this.unhold = function() {
        printDebug("Not supported");
    }
    this.isOnHold = function() {
        return {
            local: this.local_hold,
            remote: this.remove_hold
        };
    }
    this.refer = function(exten) {
        cc.blind_transfer(exten, this.id)
          .fail(printDebug);
    }
}

function phoneCTIEvent(session, cti_event) {
    switch(cti_event.name) {
        case 'call_created':
            if (session.direction == 'outgoing') {
                channelStatus(session, cti_event.data.status);
            } else {
                phone.incomingcall(session);
            }
            break;
        case 'call_updated':
            channelStatus(session, cti_event.data.status);
            break;
        case 'call_ended':
            $.each(phone.sessions, function(key, value) {
                if (value.id == cti_event.data.call_id) {
                    printDebug("We find active call: " + key);
                    phone.activeUUID = key;
                }
            });
            phone.transition("terminated");
            break;
        case 'call_held':
        case 'call_resumed':
            printActiveCall(session);
            break;
        default:
            printDebug("Event name no catched: " + cti_event.name);
    }
}

function channelStatus(session, status) {
    switch(status) {
        case 'Ring':
        case 'Ringing':
            if (session.direction == 'outgoing') {
                phone.transition("onprogress", session);
            } else {
                phone.incomingcall(session);
            }
            break;
        case 'Up':
            session.status = 'oncall';
            phone.transition("oncall", session);
            break;
        case 'Down':
            printDebug('Need to check why status is down...');
            break;
    }
}

var xivoEvents = function(data) {
    switch(data.name) {
        case 'users_services_dnd_updated':
            printDND(data.data);
            break;
        case 'users_forwards_unconditional_updated':
            printUForward(data.data);
            break;
        case 'users_forwards_noanswer_updated':
            printNAForward(data.data);
            break;
        case 'users_forwards_busy_updated':
            printBusyForward(data.data);
            break;
        case 'endpoint_status_update':
            data.data.xivo_uuid = data.origin_uuid;
            updateLineStatus(data.data);
            break;
        case 'user_status_update':
            data.data.xivo_uuid = data.origin_uuid;
            if (data.data.user_uuid == ctxStorage.getSession().uuid) {
                setUserPresence(data.data);
            }
            setUserUUIDPresence(data.data);
            break;
        case 'chat_message_event':
            receivedChatEvent(data.data);
            break;
        case 'call_resumed':
        case 'call_held':
            updateCTISession(data);
            break;
        case 'call_ended':
        case 'call_updated':
            if (! $.isEmptyObject(phone.sessions)) {
                updateCTISession(data);
            }
            break;
        case 'call_created':
            if (phone.cti == true) {
                if (data.data.user_uuid == ctxStorage.getSession().uuid) {
                    if (data.name == 'call_created' && (! phone.activeUUID || phone.sessions[phone.activeUUID].id != data.data.call_id)) {
                        session = createCTISession(data.data, data.name);
                        session.ua.on(session, data);
                    }
                }
            }
            break;
        case 'user_voicemail_message_created':
            createVoicemailMessageStatus(data.data);
            break;
        case 'user_voicemail_message_updated':
            updateVoicemailMessageStatus(data.data);
            break;
        case 'user_voicemail_message_deleted':
            deleteVoicemailMessageStatus(data.data);
            break;
        case 'voicemail_associated':
            loadVoicemails();
            break;
        case 'voicemail_dissociated':
            removeVoicemails();
            break;
        case 'favorite_added':
            //ctxFavorites.show(data.data);
            break;
        case 'favorite_deleted':
            ctxFavorites.hide(data.data.source, data.data.source_entry_id);
            break;
        case 'agent_status_update':
            updateAgentStatus(data.data);
            break;
        case 'agent_paused':
        case 'agent_unpaused':
            updateAgentPauseStatus(data.data);
            break;
        default:
            printDebug('Error: unknown Channel action: ' + data.name);
    }
}


function updateCTISession(data) {
    if (phone.cti == false) { return; }

    $.each(phone.sessions, function(key, value) {

        if (value.id == data.data.call_id) {
            if (data.data.peer_caller_id_name) {
                value.remoteIdentity.displayName = data.data.peer_caller_id_name;
            }
            if (data.data.peer_caller_id_number) {
                value.remoteIdentity.uri.user = data.data.peer_caller_id_number;
            }

            switch (data.name) {
                case 'call_resumed':
                    value.local_hold = false;
                    break;
                case 'call_held':
                    value.local_hold = true;
                    break;
                default:
                    value.local_hold = data.data.on_hold;
                    value.talking_to = data.data.talking_to;
            }

            value.ua.on(value, data);
        }
    });
}

function createCTISession(data, e) {
    if (e == 'call_created') {
        missing = 'Missing information';
        uuid = create_uuid();
        session = new uasession();
        session.ua = ua
        session.uuid = uuid
        session.timerId = [];
        session.id = data.call_id;
        session.local_hold = data.on_hold;
        session.remoteIdentity.displayName = data.peer_caller_id_name;
        session.remoteIdentity.uri.user = data.peer_caller_id_number || missing;
        session.startTime = moment(data.creation_time)._d;
        if (! session.direction) {
            if (data.status == 'Ring' || data.caller_id_number == data.peer_caller_id_number) {
                session.direction = 'outgoing';
                session.status = 'ringing';
            } else {
                session.direction = 'incoming';
                session.status = 'ring';
            }
        }

        if (! phone.activeUUID) {
            phone.activeUUID = uuid;
        }

        phone.sessions[uuid] = session;
        return session;
    }
}


function loadPhoneCTI() {
    printDebug("Load CTI phone control");
    cc.get_calls_me()
      .done(function(data) {
        phone.cti = true;
        phone.register();
        updatePhoneCTIStatus(data);
      })
      .fail(printDebug);
}

function updatePhoneCTIStatus(data) {
    if (data.items.length > 0) {
        $.each(data.items, function(key, value) {
            session = createCTISession(value, 'call_created');
            channelStatus(session, value.status);
            printActiveCall(session);
       });
    }
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


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

function loadUserPassword() {
    $('#user-password').on('change', function() {
        password = $('#user-password').val();
        changeUserPassword(password);
    });
}

function changeUserPassword(password) {
    confd.user_change_password(ctxStorage.getUuid(), password)
      .done(function() {
          sendNotification("Info system", "Your password has been changed");
      })
      .fail(printDebug);
}

function loadUserMobile(number) {
    $('#user-mobile').val(number);

    $('#user-mobile').on('change', function() {
        number = $('#user-mobile').val();
        changeUserMobile(number);
    });
}

function changeUserMobile(number) {
    confd.user_change_mobile(ctxStorage.getUuid(), number)
      .done(function() {
          sendNotification("Info system", "Your mobile number has been changed");
      })
      .fail(printDebug);
}


function loadUserGravatar(email) {
    if (email) {
        img = $.gravatar(email, {secure: true}).attr('src');
        $('.image-profile').attr('src', img);
    }
}

function loadUserEmail(email) {
    $('#user-email').val(email);

    $('#user-email').on('change', function() {
        email = $('#user-email').val();
        changeUserEmail(email);
    });
}

function changeUserEmail(email) {
    confd.user_change_email(ctxStorage.getUuid(), email)
      .done(function() {
          sendNotification("Info system", "Your email has been changed");
      })
      .fail(printDebug);
}

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

function loadFuncKeys() {
    confd.user_list_fk(ctxStorage.getUuid())
      .done(function(data) {
        printFuncKeys(data);
      })
      .fail(printDebug);
}

function printFuncKeys(data) {
    $('#view-fk-box').slimScroll({
        height: '250px'
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

function welcomeNotification() {
    if (ctxStorage.getItem('welcome') != null) {
      return false;
    }

    notification = {
      id: 'notification-' + Date.now(),
      icon: 'fa-commenting-o text-green',
      title: $.t('app.welcome.title'),
      message: $.t('app.welcome.message'),
      callback: function(result) {
        if (result) {
          ctxStorage.store('welcome', true);
        }
      }
    }
    addNotifications(notification);
}

function updateNotification(current_version) {
    notification = {
      id: 'notification-' + Date.now(),
      icon: 'fa-warning text-yellow',
      title: $.t('app.warning_upgrade_title'),
      message: $.t('app.warning_upgrade', { version: current_version })
    }
    addNotifications(notification);
}

function checkCurrentStableVersion() {
    return $.get("https://mirror.wazo.community/version/stable");
}

function checkVersion() {
    welcomeNotification();
    checkCurrentStableVersion()
    .fail(printDebug)
    .done(function(current_version) {
      confd.infos()
        .done(function(data) {
            if (!data.wazo_version) {
              updateNotification(current_version);
            } else {
              if (parseFloat(data.wazo_version) < parseFloat(current_version)) {
                updateNotification(current_version);
              }
            }
        })
        .fail(printDebug);
    });
}

function addNotifications(notification) {
    notification_header = $('<li>', { id: notification.id })
      .append($('<a>', { html: notification.title})
      .prepend($('<i>', { class: 'fa ' + notification.icon})));

    $('#notifications').append(notification_header);
    addEventNotifications(notification);

    addNotificationHeader();
}

function removeNotification(notification_id) {
    $('#' + notification_id).remove();
    addNotificationHeader();
}

function addNotificationHeader() {
    count = $("#notifications").children().length;
    if (count < 1) { count = '' };
    $('#notifications-count').html(count);

    notification_header = $('<li>', { class: 'header', html: $.t('app.notifications.have_notification', {count: count})});
    $('#notifications-menu .header').remove();
    if (count != '') {
      $('#notifications-menu').prepend(notification_header);
    }
}

function addEventNotifications(notification) {
    $('#' + notification.id).on('click', function() {
        showNotification(notification);
    });
}

function showNotification(notification) {
    if ( ! notification.callback) {
        notification.callback = function(){};
    }
    bootbox.confirm({
        title: notification.title,
        message: notification.message,
        callback: function(result) {
          notification.callback(result);
          if (result) {
            removeNotification(notification.id);
          }
        }
    });
}

function initI18n() {
    printDebug("Init i18n...");
    language_complete = navigator.language.split("-");
    language = (language_complete[0]);
    printDebug("Language: " + language);
    moment.locale(language);
    return language;
}

function loadAgent(data) {
    $('#view-agent').removeClass('hidden');
    addAgentActions();
    agentd.get_agent_by_id(data.id)
      .done(function(data) {
          updateAgentStatus(data);
      })
      .fail(printDebug);
}

function addAgentActions() {
   $('#pauseagent').on('click', function() {
       pauseAgent();
   });

   $('#unpauseagent').on('click', function() {
       unpauseAgent();
   });

   $('#loginagent').on('click', function() {
       loginAgent();
   });

   $('#logoffagent').on('click', function() {
       logoffAgent();
   });
}

function pauseAgent() {
    user = ctxStorage.getUser();
    printDebug("Pause agent: " + user.agent.number);
    agentd.pause_agent(user.agent.number)
}

function unpauseAgent() {
    user = ctxStorage.getUser();
    printDebug("UnPause agent:" + user.agent.number);
    agentd.unpause_agent(user.agent.number)
}

function loginAgent() {
    user = ctxStorage.getUser();
    extension = getAgentExtension();
    printDebug("Login agent:" + user.agent.number);
    agentd.login_agent(user.agent.number, extension, user.context)
}

function logoffAgent() {
    user = ctxStorage.getUser();
    printDebug("Logoff agent:" + user.agent.number);
    agentd.logoff_agent(user.agent.number)
}

function updateAgentStatus(data) {
    if (is_agent_is_me(data)) {
        if (data.logged == true || data.status == "logged_in") {
            toggleAgentStatus(true);
            updateAgentPauseStatus(data);
        } else {
            toggleAgentStatus(false);
        }
    }
}

function updateAgentPauseStatus(data) {
    if (is_agent_is_me(data)) {
        if (data.paused == true) {
            toggleAgentPauseStatus(true);
        } else {
            toggleAgentPauseStatus(false);
        }
    }
}

function is_agent_is_me(data) {
    user = ctxStorage.getUser();
    agent_id = data.id || data.agent_id;
    if (agent_id == user.agent.id) {
        return true;
    }

    return false;
}

function toggleAgentStatus(is_logged) {
    switch(is_logged) {
        case true:
            printDebug("Agent is logged");
            $('#loginagent').hide();
            $('#logoffagent').show();
            $('#pauseagent').show();
            $('#label-agent').removeClass("label-danger").addClass("label-success").html('C');
            break;
        case false:
            printDebug("Agent is unlogged");
            $('#loginagent').show();
            $('#logoffagent').hide();
            $('#pauseagent').hide();
            $('#unpauseagent').hide();
            $('#icon-agent').removeClass("text-orange");
            $('#label-agent').removeClass("label-success").addClass("label-danger").html('D');
            break;
    }
}

function toggleAgentPauseStatus(is_paused) {
    switch(is_paused) {
        case true:
            printDebug("Agent is paused");
            $('#pauseagent').hide();
            $('#unpauseagent').show();
            $('#icon-agent').addClass("text-orange");
            break;
        case false:
            printDebug("Agent is unpaused");
            $('#pauseagent').show();
            $('#unpauseagent').hide();
            $('#icon-agent').removeClass("text-orange");
            break;
    }
}

ctxFavorites = {
    get: function() {
        dird.list_favorites(ctxStorage.getUser().context).done(printFavorites);
    },
    add: function(contact) {
        dird.add_favorite(contact.source, contact.source_entry_id)
          .done(function() {
            ctxFavorites.show(contact);
            printDebug("Favoris has been added...");
          });
    },
    del: function(source, source_entry_id) {
        dird.delete_favorite(source, source_entry_id)
          .done(function() {
            ctxFavorites.hide(source, source_entry_id);
            printDebug("Favoris has been deleted...");
          });
    },
    show: function(contact) {
        printFavorite(contact);
        $('#addfavorite-' + contact.source + '-' + contact.source_entry_id)
          .removeClass()
          .addClass('fa fa-fw fa-star');
    },
    hide: function(source, contact_id) {
        $('.favorite-' + source + '-' + contact_id)
          .remove();

        $('#addfavorite-' + source + '-' + contact_id)
          .removeClass()
          .addClass('fa fa-fw fa-star-o');
    },
    lookup: function(contact) {
        profile = ctxStorage.getUser().context;
        dird.lookup(profile, contact)
          .done(printContacts);
    },
    create_personal: function(contact) {
        dird.create_personal_contact(contact)
          .done(function() {
            firstname = $('#firstname').val('');
            lastname = $('#lastname').val('');
            phonenumber = $('#phonenumber').val('');
            alert("Contact has been added");
          })
          .fail(function(data) {
            printDebug(data);
            alert("ERROR: Contact has not been added");
          });
    },
    delete_personal: function(id) {
        dird.delete_personal_contact(id)
          .done(function(data) {
            alert("Contact has been deleted");
            ctxFavorites.del('personal', id);
            cleanContacts();
          })
          .fail(function(data) {
            printDebug(data);
            alert("Contact has not been deleted!");
          });
    }
}

});
