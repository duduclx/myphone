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


var dird;

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