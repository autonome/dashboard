function boardcore(firebaseBaseURL, categoryPath, events) {
  var user = null,
      owner = null,
      boardName = window.location.search.replace('?', ''),
      auth = null,
      firebaseURL = firebaseBaseURL + '/' + categoryPath + '/' || 'https://mozilla.firebaseio.com/dashboards/',
      firebaseRef = new Firebase(firebaseURL),
      debug = true

  // populate sidebar
  var boardLinkTemplate = document.querySelector('#board-link').content,
      sidebar = document.querySelector('#sidebar')
  firebaseRef.on('child_added', function(board) {
    var boardName = board.ref().name(),
        a = boardLinkTemplate.querySelector('a')
    a.innerHTML = boardName
    a.href = document.location.href.replace(document.location.search, '?' + boardName)
    sidebar.appendChild(boardLinkTemplate.cloneNode(true))
  })

  // check persona login
  auth = new FirebaseSimpleLogin(firebaseRef, function(error, user) {
    if (error) {
      // an error occurred while attempting login
      console.log('login error', error)
    }
    else if (user) {
      // user authenticated with Firebase
      //console.log('User ID: ' + user.id + ', Provider: ' + user.provider)
      events.emit('loggedIn', user)
    }
    else {
      // user is not logged in
      console.log('user logged out?')
      events.emit('loggedOut')
    }
  })

  function userIsOwner() {
    return (owner && user && user.id == owner) || false
  }

  // login button
  function signin() {
    if (!user) {
      auth.login('persona', {
        rememberMe: true
      })
    }
    else {
      auth.logout()
    }
  }
  $('#signin').on('click', signin)

  $('#createButton').on('click', function() {
    // TODO: disable create button while saving

    // save
    firebaseRef.child(boardName).set({
      owner: user.id,
      title: boardName
    }, function(error) {
      if (!error) {
        window.location.reload(true)
      }
      else {
        // TODO: some kind of error
      }
    })
  })

  function boardExists(boardName) {
    var ref = firebaseRef.child(boardName).child('owner')
    ref.once('value', function(snapshot) {
      events.emit('boardExists', snapshot.val())
    })
  }

  function getBoardOwner(firebaseRef, boardName, user) {
    var ref = firebaseRef.child(boardName).child('owner')
    ref.once('value', function(snapshot) {
      events.emit('boardOwner', snapshot.val())
    })
  }

  events.on('boardExists', function(boardOwner) {
    // board does exist
    if (boardOwner) {
      owner = boardOwner
      $('#noLogin').hide()
      $('#noBoard').hide()

      document.title = capitalise(boardName)
      $('#title').html(capitalise(boardName))

      events.emit('ready', boardName, firebaseRef, userIsOwner())
    }
    // board doesn't exist
    else {
      // user is logged in && name is valid
      var nameIsValid = /^[a-z0-9\-]+$/i.test(boardName)
      if (user && nameIsValid) {
        //console.log('boardExists: user & valid name')
        $('#createBoard').show()
        $('#badBoard').hide()
        $('#noBoard').hide()
        $('#noLogin').hide()
      }
      // user is logged in && name is not valid
      else if (user && !nameIsValid) {
        //console.log('boardExists: user & invalid name')
        $('#createBoard').hide()
        $('#badBoard').show()
        $('#noBoard').hide()
        $('#noLogin').hide()
      }
    }
  })

  events.on('loggedIn', function(data) {
    $('#signin')
      .removeAttr('disabled')
      .html('Sign Out')

    if (!boardName) {
      $('#noBoard').show()
    }

    if (data) {
      user = data
      $('#noLogin').hide()
      if (userIsOwner())
        events.emit('editable')
    }
    else
      $('#noLogin').show()
  })

  events.on('loggedOut', function() {
    user = null
    $('#signin')
      .removeAttr('disabled')
      .html('Sign In')
    $('.editButton').hide()
    $('.deleteButton').hide()
    if (!boardName) {
      $('#noLogin').show()
      $('#noBoard').hide()
      $('#createBoard').hide()
    }
  })

  // load board if there is one
  if (boardName) {
    boardExists(boardName)
  }

  function capitalise(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
