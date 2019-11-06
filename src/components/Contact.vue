<template>
  <div class="contact">
    <v-alert v-model="errorState"
      :value="true"
      type="error"
      dismissible
    >
      {{errorMsg}}
    </v-alert>
    <h1>{{ msg }}</h1>
    <v-container fluid grid-list-md>
      <v-layout row wrap>
        <v-flex class="d-flex" xs12>
          <v-radio-group label="I want to ... " v-model="contactType" row>
            <div>&nbsp;&nbsp;</div>
            <v-radio label="Ask questions" value="questions"  v-on:change="setHelpText()"></v-radio>
            <v-radio label="Report a problem" value="report-problem"  v-on:change="setHelpText()"></v-radio>
            <v-radio label="Make suggestions" value="suggestions" v-on:change="setHelpText()"></v-radio>
            <v-radio label="Make comments" value="comments" v-on:change="setHelpText()"></v-radio>
          </v-radio-group>
        </v-flex>
      </v-layout>
      <v-layout row wrap>
        <v-flex xs2 v-show="contactType=='questions'">
          We're here for you.
          <br/>Please be as concise as possible with your questions so that we're able to answer them effectively.
          <br/>Thank you.
        </v-flex>
        <v-flex xs2 v-show="contactType=='report-problem'">
          We're just as disappointed as you are that you've found a problem!
          <br/>To faciliate quick resolution, please describe the issue as succinctly as possible.
          <br/>Use specifics about the steps leading up to the issue especially regarding selections made,
          affected files, relevant error messages (copy/paste if possible) and exactly how the problem might be
          re-created.
          <br/>Thank you.
        </v-flex>
        <v-flex xs2 v-show="contactType=='suggestions'">
          We really appreciate your suggestions!
          <br/>Be sure to let us know about any specific areas that apply.  If your suggestions are related to processes e.g.
           how samples are uploaded, be sure to help us understand how a different process would help and what steps
          you're suggesting.
          <br/>Thank you.
        </v-flex>
        <v-flex xs2 v-show="contactType=='comments'">
          Comments are always welcome!
          <br/>Thank you.
        </v-flex>
        <v-flex xs8>
          <v-textarea v-model="textData" solo name="bodytext" :label="getHelpText()" value="" rows="20" hint=""></v-textarea>
        </v-flex>
        <v-flex xs1>
          Thank you for using NanoMine!
        </v-flex>
      </v-layout>
      <v-layout>
        <v-btn raised color="primary" v-on:click="send()">Send <v-icon right>send</v-icon> </v-btn>
        <v-btn raised color="normal" v-on:click="cancel()">Cancel <v-icon right>remove_circle_outline</v-icon></v-btn>
      </v-layout>
      <div class="text-xs-center">
        <v-dialog
          v-model="confirmationDialog"
          width="500"
        >
          <v-card>
            <v-card-title
              class="headline grey lighten-2"
              primary-title
            >
              NanoMine Contact
            </v-card-title>

            <v-card-text>
              Thank you for your submission
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                flat
                @click="dialogClose()"
              >
                Close
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>
    </v-container>
  </div>
</template>

<script>
import {} from 'vuex'
import Axios from 'axios'

export default {
  name: 'Contact',
  data () {
    return {
      msg: 'Contact the NanoMine Team',
      helpText: 'Enter problem description',
      textData: '',
      contactType: 'comments',
      confirmationDialog: false,
      errorState: false,
      errorMsg: ''
    }
  },
  mounted: function () {
    this.setHelpText()
  },
  methods: {
    setLoading: function () {
      this.$store.commit('isLoading')
    },
    resetLoading: function () {
      this.$store.commit('notLoading')
    },
    dialogClose: function () {
      let vm = this
      vm.confirmationDialog = false
      vm.$router.go(-1)
    },
    getHelpText: function () {
      let vm = this
      return vm.helpText
    },
    setHelpText: function () {
      let vm = this
      vm.$nextTick(function () {
        if (vm.contactType === 'comments') {
          vm.helpText = 'Enter your comments here...'
        } else if (vm.contactType === 'suggestions') {
          vm.helpText = 'Enter your suggestions here...'
        } else if (vm.contactType === 'questions') {
          vm.helpText = 'Enter your questions here...'
        } else {
          vm.helpText = 'Enter problem description and information to help us re-create the problem here...'
        }
      })
    },
    send: function () {
      let vm = this
      if (vm.textData.length > 0) {
        vm.setLoading()
        let contactUrl = '/nmr/contact'
        setTimeout(function () {
          Axios.post(contactUrl, {
            contactType: vm.contactType,
            contactText: vm.textData
          })
            .then(function (response) {
              console.log(response)
              vm.resetLoading()
              vm.confirmationDialog = true
            })
            .catch(function (err) {
              vm.errorState = true
              vm.errorMsg = 'We apologize. Your contact request failed. Please try again later. err: ' + err
              vm.resetLoading()
            })
        })
      } else {
        vm.errorState = true
        vm.errorMsg = 'Please provide the text of your request.'
      }
    },
    cancel: function () {
      this.$router.go(-1)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  img {
    width: 50px;
    height: auto;
  }
  h1 {
    margin-top: 5px;
    margin-bottom: 5px;
  }
  h4 {
    text-transform: uppercase;
  }
  h1 {
    margin-top: 10px;
    background-color: black;
    color: white;
  }

</style>
