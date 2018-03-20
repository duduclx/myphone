/*
@licstart  The following is the entire license notice for the 
JavaScript code in this page.

Copyright (C) 2016  Sylvain Boily

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
 * @class XiVODird
 *
 * @public
 */
var XiVODird = function(args) {
    this.host = args.host;
    this.token = args.token;
    this.port = args.port || 9489;
    this.https_port = args.https_port || 443;
    this.prefix_enabled = args.prefix || false;

    this.api_version = '0.1';
    this.default_backend = 'xivo_service';
    this.prefix = 'api/dird';
}

/*
 * Connection to the REST API
 *
 * @private
 */
XiVODird.prototype._connect = function() {
    suffix = ":" + this.port + "/" + this.api_version + "/";
    if (this.prefix_enabled) {
        suffix = ":" + this.https_port + "/" + this.prefix + '/' + this.api_version + "/"
    }
    host = "https://" + this.host + suffix;
    return new $.RestClient(host);
}

/*
 *  Get a contact
 *
 *  @param profile - Profile you want to use for searching
 *  @param term - Term you search
 *  @public
 */
XiVODird.prototype.lookup = function(profile, term) {
    client = this._connect();

    client.add('directories', {
        stripTrailingSlash: true,
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.directories.add('lookup');

    return client.directories.lookup.read(profile, {term:term});
}

/*
 *  Get favorites contacts
 *
 *  @param profile - Profile you want to use for searching
 *  @public
 */
XiVODird.prototype.list_favorites = function(profile) {
    client = this._connect();

    client.add('directories', {
        stripTrailingSlash: true,
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.directories.add('favorites');

    return client.directories.favorites.read(profile);
}

/*
 *  Add favorite contact
 *
 *  @param source - valid source contact
 *  @param contact_id - The contact ID
 *  @public
 */
XiVODird.prototype.add_favorite = function(source, contact_id) {
    client = this._connect();

    client.add('directories', {
        stripTrailingSlash: true,
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.directories.add('favorites', {
        isSingle: true
    });
    client.directories.favorites.add(source);

    return client.directories.favorites[source].update(contact_id);
}

/*
 *  Remove favorite contact
 *
 *  @param source - valid source contact
 *  @param contact_id - The contact ID
 *  @public
 */
XiVODird.prototype.delete_favorite = function(source, contact_id) {
    client = this._connect();

    client.add('directories', {
        stripTrailingSlash: true,
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.directories.add('favorites', {
        isSingle: true
    });
    client.directories.favorites.add(source);

    return client.directories.favorites[source].del(contact_id);
}

/*
 *  Add personal contact
 *
 *  @param contact - The contact
 *  @public
 */
XiVODird.prototype.create_personal_contact = function(contact) {
    client = this._connect();

    contact = {
        'firstname': contact.firstname,
        'lastname': contact.lastname,
        'number': contact.number
    }

    client.add('personal', {
        stripTrailingSlash: true,
        isSingle: true,
        stringifyData: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    return client.personal.create(contact);
}

/*
 *  Delete personal contact
 *
 *  @param contact_id - The contact ID
 *  @public
 */
XiVODird.prototype.delete_personal_contact = function(contact_id) {
    client = this._connect();

    client.add('personal', {
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    return client.personal.del(contact_id);
}
