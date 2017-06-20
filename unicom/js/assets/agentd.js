/*
@licstart  The following is the entire license notice for the
JavaScript code in this page.

Copyright (C) 2017 Sylvain Boily <quintana@wazo.community>

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
 * @class XiVOAgentd
 *
 * @public
 */
var XiVOAgentd = function(args) {
    this.host = args.host;
    this.token = args.token;
    this.port = args.port || 9493;
    this.https_port = args.https_port || 443;
    this.prefix_enabled = args.prefix || false;

    this.api_version = '1.0';
    this.default_backend = 'xivo_service';
    this.prefix = 'api/agentd';
}

/*
 * Connection to the REST API
 *
 * @private
 */
XiVOAgentd.prototype._connect = function() {
    suffix = ":" + this.port + "/" + this.api_version + "/";
    if (this.prefix_enabled) {
        suffix = ":" + this.https_port + "/" + this.prefix + '/' + this.api_version + "/"
    }
    host = "https://" + this.host + suffix;
    return new $.RestClient(host);
}

/*
 *  Get a agent status
 *
 *  @param id - valid agent id
 *  @public
 */
XiVOAgentd.prototype.get_agent_by_id = function(id) {
    client = this._connect();

    client.add('agents', {
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.agents.add('by-id', { stripTrailingSlash: true });

    return client.agents['by-id'].read(id);
}

/*
 *  Pause an agent
 *
 *  @param agent_number - valid agent number
 *  @public
 */
XiVOAgentd.prototype.pause_agent = function(number, reason='Pause by unicom') {
    client = this._connect();

    reason_pause = {
        reason: reason
    }

    client.add('agents', {
        isSingle: true,
        stringifyData: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.agents.add('by-number')
                 .add('pause', { stripTrailingSlash: true });

    return client.agents['by-number'].pause.create(number, reason_pause);
}

/*
 *  Unpause an agent
 *
 *  @param agent_number - valid agent number
 *  @public
 */
XiVOAgentd.prototype.unpause_agent = function(number) {
    client = this._connect();

    client.add('agents', {
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.agents.add('by-number')
                 .add('unpause', { stripTrailingSlash: true });

    return client.agents['by-number'].unpause.create(number);
}

/*
 *  Logoff an agent
 *
 *  @param agent_number - valid agent number
 *  @public
 */
XiVOAgentd.prototype.logoff_agent = function(number) {
    client = this._connect();

    client.add('agents', {
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.agents.add('by-number')
                 .add('logoff', { stripTrailingSlash: true });

    return client.agents['by-number'].logoff.create(number);
}

/*
 *  Login an agent
 *
 *  @param agent_number - valid agent number
 *  @param extension - telephone extension where agent is available
 *  @param context - context where the phone is available
 *  @public
 */
XiVOAgentd.prototype.login_agent = function(number, extension, context) {
    client = this._connect();

    agent_login = {
      extension: extension,
      context: context
    }

    client.add('agents', {
        isSingle: true,
        stringifyData: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.agents.add('by-number')
                 .add('login', { stripTrailingSlash: true });

    return client.agents['by-number'].login.create(number, agent_login);
}
