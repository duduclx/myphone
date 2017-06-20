/*
@licstart  The following is the entire license notice for the 
JavaScript code in this page.

Copyright (C) 2015  Sylvain Boily

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


/*
 * @class XiVOAuth
 *
 * @public
 */
var XiVOCallControl = function(args) {
    this.host = args.host;
    this.token = args.token;
    this.port = args.port || 9500;
    this.https_port = args.https_port || 443;
    this.prefix_enabled = args.prefix || false;

    this.api_version = '1.0';
    this.default_backend = 'xivo_service';
    this.prefix = 'api/ctid-ng';
}

/*
 * Connection to the REST API
 *
 * @private
 */
XiVOCallControl.prototype._connect = function() {
    suffix = ":" + this.port + "/" + this.api_version + "/";
    if (this.prefix_enabled) {
        suffix = ":" + this.https_port +"/" + this.prefix + '/' + this.api_version + "/"
    }
    host = "https://" + this.host + suffix;
    return new $.RestClient(host);
}

/*
 *  Make call
 *  
 *  @param extension - extension to call
 *  @public
 */
XiVOCallControl.prototype.make_call_me = function(extension, line_id) {
    client = this._connect();

    number = {
        extension: extension,
        line_id: line_id
    }

    client.add('users', {
        stripTrailingSlash: true,
        stringifyData: true,
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('me', {isSingle: true}).add('calls', {isSingle: true});

    return client.users.me.calls.create(number);
}

/*
 *  Get calls
 *  
 *  @public
 */
XiVOCallControl.prototype.get_calls_me = function() {
    client = this._connect();

    client.add('users', {
        stripTrailingSlash: true,
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('me', {isSingle: true}).add('calls', {isSingle: true});

    return client.users.me.calls.read();
}

/*
 *  Get a call info
 *  
 *  @param call_id - a call id
 *  @public
 */
XiVOCallControl.prototype.get_call = function(call_id) {
    client = this._connect();

    client.add('calls', {
        stripTrailingSlash: true,
        stringifyData: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    return client.calls.read(call_id);
}

/*
 *  Hangup a call
 *  
 *  @param call_id - Id of the channel
 *  @public
 */
XiVOCallControl.prototype.hangup_me = function(call_id) {
    client = this._connect();

    client.add('users', {
        stripTrailingSlash: true,
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('me', {isSingle: true}).add('calls');

    return client.users.me.calls.del(call_id);
}

/*
 *  chat with user
 *
 *  @param from - user_id from
 *  @param to - user_id to
 *  @param msg - message you want to send
 *  @param alias - alias name
 *  @public
 */


XiVOCallControl.prototype.send_my_message = function(to_xivo_uuid, to, msg, alias) {
    client = this._connect();

    chat = { 
        to_xivo_uuid: to_xivo_uuid,
        to: to,
        msg: msg,
        alias: alias
    };


    client.add('users', {
        stringifyData: true,
        isSingle: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token }, jsonp: false }
    });

    client.users.add('me', {isSingle: true}).add('chats', {isSingle: true});

    return client.users.me.chats.create(chat);
}

/*
 *  User presence
 *
 *  @param status_name - name of the status
 *  @public
 */
XiVOCallControl.prototype.update_my_user_presence = function(status_name) {
    client = this._connect();

    presence = {
        presence: status_name
    };

    client.add('users', {
        stringifyData: true,
        stripTrailingSlash: true,
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('me', {isSingle: true}).add('presences', {isSingle: true});

    return client.users.me.presences.update(presence);
}

/*
 *  Get my user presence
 *
 *  @public
 */
XiVOCallControl.prototype.get_my_user_presence = function() {
    client = this._connect();

    client.add('users', {
        isSingle: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('me', {isSingle: true}).add('presences', {isSingle: true});

    return client.users.me.presences.read();
}

/*
 *  Get user presence
 *
 *  @param uuid - User UUID
 *  @public
 */
XiVOCallControl.prototype.get_user_presence = function(uuid, xivo_uuid) {
    client = this._connect();

    uuid = uuid.toString();

    client.add('users', {
        isSingle: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add(uuid, {isSingle: true}).add('presences', {isSingle: true});

    if (xivo_uuid) {
        return client.users[uuid].presences.read({xivo_uuid: xivo_uuid});
    }
    else {
        return client.users[uuid].presences.read();
    }
}


/*
 *  Get line status
 *
 *  @param line_id - Line ID
 *  @public
 */
XiVOCallControl.prototype.get_line_status = function(line_id, xivo_uuid) {
    client = this._connect();

    line_id = line_id.toString();

    client.add('lines', {
        isSingle: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.lines.add(line_id, {isSingle: true}).add('presences', {isSingle: true});

    if (xivo_uuid) {
        return client.lines[line_id].presences.read({xivo_uuid: xivo_uuid});
    }
    else {
        return client.lines[line_id].presences.read();
    }
}

/*
 *  Blind transfer
 *
 *  @param exten - Extension to transfer
 *  @param initiator - call_id initiator of the transfer
 *  @public
 */
XiVOCallControl.prototype.blind_transfer = function(exten, call_id) {
    client = this._connect();

    transfer = {
        exten: exten,
        flow: 'blind',
        initiator_call: call_id
    }

    client.add('users', {
        isSingle: true,
        stripTrailingSlash: true,
        stringifyData: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('me', {isSingle: true}).add('transfers', {isSingle: true});

    return client.users.me.transfers.create(transfer);
}


/*
 *  List voicemail
 *
 *  @public
 */
XiVOCallControl.prototype.list_my_voicemails = function() {
    client = this._connect();

    client.add('users', {
        isSingle: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('me', {isSingle: true}).add('voicemails', {isSingle: true});

    return client.users.me.voicemails.read();
}

/*
 *  Delete voicemail
 *
 *  @param message_id - valid message ID
 *  @public
 */
XiVOCallControl.prototype.delete_my_message = function(message_id) {
    client = this._connect();

    client.add('users', {
        isSingle: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('me', {isSingle: true})
                .add('voicemails', {isSingle: true})
                .add('messages');

    return client.users.me.voicemails.messages.del(message_id);
}

/*
 *  Listen voicemail (this function is not async)
 *
 *  @param message_id - valid message ID
 *  @public
 */
XiVOCallControl.prototype.listen_my_message = function(message_id) {
    suffix = ":" + this.port + "/" + this.api_version + "/users/me/voicemails/messages/" + message_id + "/recording?token=" + this.token;
    if (this.prefix_enabled) {
        suffix = ":" + this.https_port + "/" + this.prefix + '/' + this.api_version + "/users/me/voicemails/messages/" + message_id + "/recording?token=" + this.token;
    }
    return "https://" + this.host + suffix;
}

/*
 *  List calls queued in switchboard
 *
 *  @param switchboard_uuid - Switchboard UUID
 *  @public
 */
XiVOCallControl.prototype.list_calls_queued = function(switchboard_uuid) {
    client = this._connect();

    client.add('switchboards', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.switchboards.add('calls', {isSingle: true})
                       .add('queued', {isSingle: true, stripTrailingSlash: true});

    return client.switchboards.calls.queued.read(switchboard_uuid);
}

/*
 *  Answer call queued in switchboard
 *
 *  @param switchboard_uuid - Switchboard UUID
 *  @param call_id - Call ID
 *  @public
 */
XiVOCallControl.prototype.answer_call_queued = function(switchboard_uuid, call_id) {
    client = this._connect();

    client.add('switchboards', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.switchboards.add('calls', {isSingle: true})
                       .add('queued')
                       .add('answer', {isSingle: true, stripTrailingSlash: true});

    return client.switchboards.calls.queued.answer.update(switchboard_uuid, call_id);
}

/*
 *  List calls held in switchboard
 *
 *  @param switchboard_uuid - Switchboard UUID
 *  @public
 */
XiVOCallControl.prototype.list_calls_held = function(switchboard_uuid) {
    client = this._connect();

    client.add('switchboards', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.switchboards.add('calls', {isSingle: true})
                       .add('held', {isSingle: true, stripTrailingSlash: true});

    return client.switchboards.calls.held.read(switchboard_uuid);
}

/*
 *  Answer call held in switchboard
 *
 *  @param switchboard_uuid - Switchboard UUID
 *  @param call_id - Call ID
 *  @public
 */
XiVOCallControl.prototype.answer_call_held = function(switchboard_uuid, call_id) {
    client = this._connect();

    client.add('switchboards', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.switchboards.add('calls', {isSingle: true})
                       .add('held')
                       .add('answer', {isSingle: true, stripTrailingSlash: true});

    return client.switchboards.calls.held.answer.update(switchboard_uuid, call_id);
}

/*
 *  Put call on hold in switchboard
 *
 *  @param switchboard_uuid - Switchboard UUID
 *  @param call_id - Call ID
 *  @public
 */
XiVOCallControl.prototype.hold_call_held = function(switchboard_uuid, call_id) {
    client = this._connect();

    client.add('switchboards', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.switchboards.add('calls', {isSingle: true})
                       .add('held', {stripTrailingSlash: true});

    return client.switchboards.calls.held.update(switchboard_uuid, call_id);
}
