# Matrix Quitter

![going home](http://s2.quickmeme.com/img/a2/a251beb450c4396772febf13fb8798a997df0e7d8fb641d03c33719bffea1d25.jpg)

Make a user on your homeserver leave every room.

## How to use

1. `cp ./config.example.js ./config.js`
2. Edit config.js to make it point to your synapse postgres database (this is needed in order to extract auth tokens)
3. `node ./quit.js <matrix_handle>`

## Bugs

* Sometimes the script thinks the person is in rooms they're actually not in and tries to quit them, so after it's done it may still try to quit someone from some rooms.
* You can't use it on people who are hosted on a homeserver that you don't control, even if they're assholes.