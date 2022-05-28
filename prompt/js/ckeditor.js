// Use JavaScript Strict Mode.
"use strict";

(function() {
    if (typeof CKEDITOR!=="undefined") {
        
        // Turn off automatic editor creation first.
        CKEDITOR.disableAutoInline = true;
        
        // Create editor
        CKEDITOR.inline( 'prompt', {
            // To enable source code editing in a dialog window, inline editors require the "sourcedialog" plugin.
            extraPlugins: 'uploadimage,image2,sharedspace,sourcedialog',
            removePlugins: 'floatingspace,maximize,resize',
            sharedSpaces: {
                top: 'toolbar',
                bottom: 'statusbar'
            },
            toolbarGroups: [
            { name: 'document',    groups: [ 'document', 'print', 'mode', 'tools' ] },
            { name: 'clipboard',   groups: [ 'clipboard', 'undo' ] },
            { name: 'editing',     groups: [ 'find', 'selection' ] },
            { name: 'insert' },
            { name: 'others' },
            { name: 'colors' },
            { name: 'about' },
            '/',
            { name: 'links' },
            { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
            { name: 'paragraph',   groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
            { name: 'styles' }
            ],

            // Remove the redundant buttons from toolbar groups defined above.
            removeButtons: 'Save,Smiley,ShowBlocks,Unlink,Link,Blockquote,CreateDiv,PageBreak,Language,Styles',/*,Styles,Specialchar*/
            // Font sizes
            fontSize_sizes: '0.7 em/0.7em;0.8 em/0.8em;0.9 em/0,9em;1.0 em/1em;1.1 em/1.1em;1.2 em/1.2em;1.3 em/1.3em;1.4 em/1.4em;1.5 em/1.5em;1.6 em/1.6em;1.7 em/1.7em;1.8 em/1.8em;1.9 em/1.9em;2.0 em/2em;2.1 em/2.1em;2.2 em/2.2em;2.3 em/2.3em;2.4 em/2.4em;2.5 em/2.5em;2.6 em/2.6em;2.7 em/2.7em;2.8 em/2.8em;2.9 em/2.9em;3.0 em/3em',
            // Font sizes
            line_height: '1 em/1em;1.1 em/1.1em;1.2 em/1.2em;1.3 em/1.3em;1.4 em/1.4em;1.5 em/1.5em;1.6 em/1.6em;1.7 em/1.7em;1.8 em/1.8em;1.9 em/1.9em;2.0 em/2.0em',
            // Quick tables
            qtRows: 10, // Count of rows
            qtColumns: 10, // Count of columns
            qtBorder: '0', // Border of inserted table
            qtWidth: '100%', // Width of inserted table
            qtCellPadding: '0', // Cell padding table
            qtCellSpacing: '0', // Cell spacing table
        });

        CKEDITOR.on( 'dialogDefinition', function( ev ) {
            var dialogName = ev.data.name;
            var dialogDefinition = ev.data.definition;
            console.log(dialogName);
            if ( dialogName == 'table' ) {
                var info = dialogDefinition.getContents( 'info' );
                console.log(info);      
                info.get( 'txtWidth' )[ 'default' ] = '100%';
                info.get( 'txtBorder' )[ 'default' ] = '0';
                info.get( 'txtRows' )[ 'default' ] = '1';
                info.get( 'txtCols' )[ 'default' ] = '3';
                info.get( 'txtCellSpace' )[ 'default' ] = '0';
                info.get( 'txtCellPad' )[ 'default' ] = '0';
            }
            if ( dialogName == 'iframe' ) {
                var info = dialogDefinition.getContents( 'info' );
                console.log(info);
                info.get( 'width' )[ 'default' ] = '100%';
                info.get( 'height' )[ 'default' ] = '50%';
            }
            if ( dialogName == 'flash' ) {
                var info = dialogDefinition.getContents( 'info' );
                console.log(info);
                info.get( 'width' )[ 'default' ] = '100%';
                info.get( 'height' )[ 'default' ] = '50%';
                info.get( 'hSpace' )[ 'default' ] = '0';
                info.get( 'vSpace' )[ 'default' ] = '0';
            }
            if ( dialogName == 'image2' ) {
                var info = dialogDefinition.getContents( 'info' );
                console.log(info);  
                info.get( 'width' )[ 'default' ] = '100%';
                info.get( 'height' )[ 'default' ] = 'auto';
            }
        });
    }
}());