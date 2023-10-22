# Language-Support and Debugger for Yottadb / GT.M

This is a language support for Mumps (M) running on Yottadb/GT.M

## Features
* Syntax-highlighting
* Finding entryrefs
* Single-step-debugging
* Breakpoints and conditional breakpoints possible
* subroutine-check for correct NEWing
* Conversion from short to long commands and vice versa via CTRL-E
* completely free, just have fun - BUT ALL ON YOUR OWN RISK!


## Using mumps-debug

![caption](https://github.com/jewuma/mumps-debug/blob/master/demovideo.gif)

* Install the **mumps-debug** extension in VS Code.
* Put the MDEBUG.m Routine in your M-Program-Directory and start it.
* Edit the launch.json and set hostname of the host MDEBUG runs on.
* Maybe change Port in launch.json and in MDEBUG.m if Port 9000 isn't useable.

* Also set the localRoutinesPath to map the directory on your VS Code machine to the machine where MDEBUG.m runs.

* Open a M-Program you want to debug in VS Code and start debugging via "F5"
* New in Version 0.8.0: Press Ctrl-E to toggle between long and short Command-Format
* New in Version 1.0.0: Variables are checked for correct NEWing.

If you don't want some or all variables to be checked you can change this in Settings->Settings->Extensions->mumps-debug
Example: Variables Y,Y1,YDATE,X are constants you don't want to NEW
you put in the settings above: ``Y.*,X``
If you want to disable this check only in one file, just add a comment line: ``;ignoreVars:abc,def.*``

If you discover problems please send a bug report on the github-page.

## Project Page:

[https://github.com/jewuma/mumps-debug.git](https://github.com/jewuma/mumps-debug.git)

## launch.json:

A possible `launch.json` could look like this:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "mumps",
      "request": "launch",
      "name": "Debug active File",
      "program": "${file}",
      "stopOnEntry": true,
      "hostname": "192.168.0.1",
      "localRoutinesPath": "y:\\",
      "port": 9000
    }
  ]
}
