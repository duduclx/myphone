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