/*
	Imaginary Teleprompter
	Copyright (C) 2015 Imaginary Sense Inc. and contributors

	This file is part of Imaginary Teleprompter.

	Imaginary Teleprompter is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Imaginary Teleprompter is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with Imaginary Teleprompter.  If not, see <https://www.gnu.org/licenses/>.
*/

// Global variables
var debug;
var currentVersion = "2.3.4"

var dataManager = {
	getItem: function(key,item,local,force){
		if (local == 1){
			item(localStorage.getItem(key));
		}
		else {
			item(sessionStorage.getItem(key));
		}
    },

    setItem: function (key,item,local) {
		if (local == 1) {
		    localStorage.setItem(key, item);
		}
		else {
		    sessionStorage.setItem(key, item);
		}
    },

    removeItem: function (key,local) {
		if (local == 1){
		    localStorage.removeItem(key);
		}
		else {
		    sessionStorage.removeItem(key);
		}
    },

    clearAll: async function () {
    	sessionStorage.clear();
    	localStorage.clear();
    }

};
