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