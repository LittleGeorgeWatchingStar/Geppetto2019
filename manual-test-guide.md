# Geppetto Web manual testing guide

As the name implies, this is a guide on what you should be testing before we
release a new feature or whenever there's time.

This is not an exhaustive guide so please feel free to add more as you think of it.

## Where to test?
Test in all browsers:

* Use data from Google Analytics as your guide to find combination of OS,
  OS Version, and browser
* Use Browser Stack (ask access from your manager)

## What to test?
Be sure to test all the functionality in Geppetto.

### Toolbar
Test all toolbar buttons
* as an engineer
* as an unprivileged user

### Use the App
1. Drag and drop a module and custom modules
2. Click the flags
3. Connect modules
4. Use the dimensioning system
5. Resize the board
6. Zoom in and zoom out
7. Rotate and delete modules

## How to test?
These are things you do to break things:
* Make your window size smaller and see how Geppetto reacts

### For every text field do the following:
* Leave it blank
* Special characters
* JavaScript (Test for XSS)
* Extra long text ([Lorem ipsum][lorem] is your friend)
* Anything else you can think of that will break a text box once it's submitted

### Home, New, and Open
* Click the Home or New toolbar options when:
    * Your board is empty
    * You just saved a design
    * You're in the middle of designing the board

### Open
* Open when you're logged in
* Open a private design as a normal user
* Open a design from 'Designed by Gumstix' and/or 'Community' tab
* Logout and see if you can still access your design/s

### Save, Save As, and Complete Design
* Do everything you would with a text field as outlined above
* For each test, check its effect on the following:
    * Gumstix store
    * AutoDoc
    * Rialto
    * Madison
* Save an already save design
* Save an already completed design
* Save a design while you're logged in
* Save a design while you're logged out
* Save an empty board
* Complete an empty board

### Connections and Dimensions
* You should only be able to use one if the other is enabled
* Make the dimension smaller than your modules
* Test locking a dimension

### Refocus and 3D Preview
* Click Refocus and 3D Preview on different screen sizes
* Drag your board out of view and click Refocus
* Zoom in or zoom out then click Refocus

### Show Price
* Click Show Price then
    * Drag a module to the board
    * Remove a module from the board
    * Resize the board

### Design the biggest board you can in Geppetto
1. Drag and drop all the modules you can and make it green.
2. Generate an AutoDoc on your gigantic board
3. Save your board
4. Open it in different browsers and OS and drag things around
5. Try to zoom in and zoom out
6. Complete your design

### Reminder:
* Check for speed issues or any delays that might annoy customers
* Place module close together and see how it affects flags
* Use custom modules
* Test MUGR and dev modules as well
* Check how the gigantic design affects:
    * Rialto
    * Magento (store)
    * Madison
    * Catalina
    * GDT
    * AutoDoc

[lorem]: https://en.wikipedia.org/wiki/Lorem_ipsum#Example_text
