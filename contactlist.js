/**
 * Data model for a list of contacts
 * @param {Array<Contact>} contacts
 * @param {string|number} ownerContactId -- id of the owner of the list, owner can not be added to their own list
 * @constructor
 */
function ContactList(ownerContactId, contacts) {
	this.ownerContactId = ownerContactId;
	this.contacts = [];
	if(contacts) {
		this.addMultiple(contacts);
	}
}

/**
 * @typedef {Object} ContactFilter
 * @property {Array<string>} contactIds
 * @property {boolean} isParticipant
 */

/**
 * @typedef {Object} AttributeMap
 * @property {string} attributeName -- the name of an attribute to search for
 * @property {string} propertyName -- the name of a property of the contact object to use as the value for rendering
 */

/**
 *
 * @type {{add: ContactList.addContact, remove: ContactList.removeContact, render: ContactList.renderContactList}}
 */
ContactList.prototype = {
	/**
	 * Add a contact to the list
	 * @param contactId
	 * @param name
	 * @returns {Contact}
	 */
	add: function addContact(contactId, name, isParticipant, overwrite) {
		console.log(arguments);
		if(contactId == this.ownerContactId) {
			return false;
		}
		if(this.get(contactId)) {
			if(!overwrite) {
				return false;
			} else {
				this.remove(contactId);
			}
		}
		return this.contacts.push(new Contact(contactId, name, isParticipant));
	},
	/**
	 * add contacts from an array of contact-like objects.  preserves existing contacts by default
	 * @param {Array<Object>} contacts
	 */
	addMultiple: function(contacts, overwrite) {
		if(contacts && contacts.forEach) {
			contacts.forEach(function(contact) {
				var name = contact.name ? contact.name + " (" + contact.username + ")" : contact.username,
					isParticipant = !!contact.isParticipant;
				this.add(contact.userid, name, isParticipant, overwrite);
			}.bind(this));
			this.sort();
		}
	},
	/**
	 * get a contact by id
	 * @param contactId
	 * @returns {Contact}
	 */
	get: function getContact(contactId) {
		return this.contacts.find(function(contact) {
			return contact.userid == contactId;
		});
	},
	/**
	 * Remove a contact from the list
	 * @param contactId
	 */
	remove: function removeContact(contactId) {
		this.contacts.splice(this.contacts.findIndex(function(contact) {
			return contact.userid == contactId;
		}), 1);
	},
	/**
	 * return an array of contacts
	 * @param {ContactFilter} filter
	 * @return {Array<Contact>}
	 */
	find: function findContacts(filter) {
		var contacts = [],
			include = false,
			contact;
		if(filter.contactIds)  {
			filter.contactIds.forEach(function(contactId) {
				include = false;
				contact = this.get(contactId);
				if(!contact) {
					return;
				} else if(typeof(filter.isParticipant) === 'undefined') {
					include = true;
				} else {
					include = (filter.isParticipant === contact.isParticipant());
				}
				if(include) {
					contacts.push(contact);
				}
			}.bind(this));
		} else if(typeof(filter.isParticipant) !== 'undefined') {
			for(var i = 0; i < this.contacts.length; i++) {
				contact = this.contacts[i];
				if(filter.isParticipant === contact.isParticipant()) {
					contacts.push(contact);
				}
			}
		}
		return contacts;
	},
	/**
	 * sort the array
	 */
	sort: function sortContacts() {
		this.contacts.sort(this.newer);
	},
	/**
	 * a comparator for sorting by most recently contacted first, then by name for contacts with same last access.
	 * @param oneContact
	 * @param anotherContact
	 * @returns {number}
	 */
	newer: function(oneContact, anotherContact) {
		if(oneContact.lastAccess === anotherContact.lastAccess) {
			return (oneContact.name.toUpperCase() < anotherContact.name.toUpperCase()) ? -1 : 1;
		} else {
			return (oneContact.lastAccess < anotherContact.lastAccess) ? -1 : 1;
		}
		return 0;
	},
	/**
	 * use a given stub to render the selected contacts to an element in the dom
	 * @param {string} stubId
	 * @param {Array<AttributeMap>} attributeMappings what are the attribute keys to be applied
	 * @param {string} appendToElementId
	 * @param {ContactFilter} filter Optional
	 */
	render: function renderContactList(stubId, attributeMappings, appendToElementId, filter) {
		var appendToElement = document.getElementById(appendToElementId);
		if(!appendToElement) {
			return false;
		}
		var contacts = this.contacts;
		appendToElement.innerHTML = '';
		if(filter) {
			contacts = this.find(filter);
			contacts.forEach(function(contact) {
				contact.render(stubId, attributeMappings, appendToElementId);
			});
		} else {
			for(var i = 0; i < this.contacts.length; i++) {
				var contact = this.contacts[i];
				contact.render(stubId, attributeMappings, appendToElementId);
			}
		}
	},
	/**
	 * perform a case-insensitive pattern match against the names in the contact list, returning an array of the userids
	 * @param {string} searchText -- the text to search
	 * @returns {Array<number>} -- array of user ids
	 */
	search: function searchContacts(searchText) {
		var searchRegEx =  new RegExp(searchText, "i");
		return this.contacts.filter(function(contact) {
			return searchRegEx.test(contact.name);
		}).map(function(contact) {
			return parseInt(contact.userid);
		});
	}
};

/**
 * Data model for a contact
 * @param {string} id -- userId of the contact
 * @param {string} name -- user's name for display purposes
 * @param {boolean} isParticipant -- a flag to identify participants in a given context for filtering.
 * @param {string} source -- source of the contact (email -> cached email contacts, mutual -> mutual followers api endpoint)
 * @param {number} lastAccess -- timestamp of the last access, intended to persist across sessions via cache
 * @constructor
 */
function Contact(id, name, isParticipant, source, lastAccess) {
	this.id = id;
	this.userid = id;
	this.name = name;
	this.participant = !!isParticipant;
	this.source = source || 'unknown';
	this.lastAccess = lastAccess || 0;
}

Contact.prototype = {
	/**
	 * set the user's participant status
	 * @param isParticpant
	 */
	setParticipant: function setParticipant(isParticipant) {
		this.participant = isParticipant;
	},
	/**
	 * get the user's participant status
	 * @returns {Contact.isParticipant}
	 */
	isParticipant: function isParticipant() {
		return this.participant;
	},
	/**
	 *
	 * @param {HTMLElement} stubId
	 * @param {Array<AttributeMap>} attributeMappings
	 * @param {HTMLElement} appendToElementId
	 */
	render: function renderContact(stubId, attributeMappings, appendToElementId) {
		var attributes = {};
		attributeMappings.forEach(function(attributeMap) {
			attributes[attributeMap.attributeName] = this[attributeMap.propertyName];
		}.bind(this));
		for(var name in attributes) {
			var value = attributes[name];
			if(value == '') {
				return false;
			}
		}
		newFromTemplate(stubId, attributes, appendToElementId);
	},
	/**
	 * update the lastAccessed property of the contact.  this property is intended to be persisted across
	 * sessions in the cache and used for sorting
	 * @param timestamp
	 */
	touch: function touchContact(timestamp) {
		var lastAccessed;
		if(typeof timestamp === "number") {
			lastAccessed = timestamp;
		} else {
			lastAccessed = Date.now();
		}
		this.lastAccess = lastAccessed;
	}
};