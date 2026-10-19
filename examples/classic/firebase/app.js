var emailRE = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

// Supply your own Firebase project configuration before loading this script.
// See README.md; a shared third-party project must never be the default target.
var config = window.FIREBASE_CONFIG
if (!config) {
  document.getElementById('firebase-status').textContent =
    'Configure your own Firebase project as described in README.md to run this example.'
} else {
firebase.initializeApp(config)

var usersRef = firebase.database().ref('users')

// create Vue app
var app = new Vue({
  // element to mount to
  el: '#app',
  // initial data
  data: {
    newUser: {
      name: '',
      email: ''
    }
  },
  // firebase binding
  // https://github.com/vuejs/vuefire
  firebase: {
    users: usersRef
  },
  // computed property for form validation state
  computed: {
    validation: function () {
      return {
        name: !!this.newUser.name.trim(),
        email: emailRE.test(this.newUser.email)
      }
    },
    isValid: function () {
      var validation = this.validation
      return Object.keys(validation).every(function (key) {
        return validation[key]
      })
    }
  },
  // methods
  methods: {
    addUser: function () {
      if (this.isValid) {
        usersRef.push(this.newUser)
        this.newUser.name = ''
        this.newUser.email = ''
      }
    },
    removeUser: function (user) {
      usersRef.child(user['.key']).remove()
    }
  }
})

}
