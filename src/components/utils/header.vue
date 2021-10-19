<template>
    <div>
        <header class="header">
            <analytics/>
            <div class="wrapper">
                <div class="header-logo" @click="links('/nm#/')">
                    <div class="">
                        <img src="/nmstatic/img/logo2.png" alt="MaterialsMine Logo">
                    </div>
                </div>
                <div class="nav_mobile-icon">
                    <div class="nav_mobile-icon-menu"></div>
                </div>
                <div class="header_nav">
                    <div class="nav nav_menu u--inline">
                        <ul>
                            <li><a href="/nm#/">NanoMine</a></li>
                            <li><a href="/nm#/mm">MetaMine</a></li>
                        </ul>
                    </div>
                    <div class="u--inline">
                        <div v-if="loginStatus" class="nav_menu--container">
                            <a class="u--default-size nav_menu--handler" style="color:#fff; font-size:1.2rem !important;" v-if="!isRunAs"><i class="material-icons" style="vertical-align: middle;">perm_identity</i> {{loginStatus ? !isRunAs ? userName : auth.getRunAsUser() : "Menu"}}</a>
                            <div class="nav_menu--siblings nav_menu--sibheader">
                                <span class="nav_menu--siblings-lists" @click="$store.commit('setLoginLogout')"><a href="#">Logout</a></span>
                            </div>
                           <!--<a v-else><i class="material-icons" style="vertical-align: bottom;">perm_identity</i> {{auth.getRunAsUser()}}</a>-->
                        </div>
                        <div v-else>
                            <a class="btn btn--tertiary btn--noradius" v-on:click="$store.commit('setLoginLogout')" href="#">Login/Register</a>
                        </div>
                        <!--<a class="btn btn--tertiary btn--normal" :href="getLoginLink()">Login/Register</a>-->
                    </div>
                </div>
            </div>
        </header>
        <div class="section_banner section_banner__misc">
            <div class="section_banner__text">
                <div class="section_banner__text-content">
                    <i class="material-icons">{{info.icon}}</i><span class="u_adjust-banner-text">{{ info.name }}</span>
                </div>
            </div>
            <div class="section_banner__nav">
                <nav class="nav_menu">
                    <ul class="nav_ul">
                        <li class="u_margin-right-small">
                            <div class="nav_menu--container">
                                <a class="u--default-size nav_menu--handler" href="#">About</a>
                                <div class="nav_menu--siblings">
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/teams')"><a href="/nm#/teams">About us</a></span>
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/how')"><a href="/nm#/how">How To</a></span>
                                    <span class="nav_menu--siblings-lists nav_menu--siblings-lists-removebdr" @click="links('/nm#/news')"><a href="/nm#/news">Research + News</a></span>
                                </div>
                            </div>
                        </li>
                        <li class="u_margin-right-small">
                            <div class="nav_menu--container">
                                <a class="u--default-size nav_menu--handler" href="#">Visualize</a>
                                <div class="nav_menu--siblings">
                                    <span class="nav_menu--siblings-lists" @click="links('/home')"><a href="/home">Browse Data</a></span>
                                    <span class="nav_menu--siblings-lists" @click="links(true,true)"><a href="/nm#/gallery">Chart Gallery</a></span>
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/imagegallery')"><a href="/nm#/imagegallery">Image Gallery</a></span>
                                </div>
                            </div>
                        </li>
                        <li class="u_margin-right-small">
                            <div class="nav_menu--container">
                                <a class="u--default-size nav_menu--handler" href="#">Upload</a>
                                <div class="nav_menu--siblings">
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/XMLCONV')"><a href="/nm#/XMLCONV">Xml-Based Upload</a></span>
                                    <span class="nav_menu--siblings-lists" @click="opnLinks()"><a @click="opnLinks()">Direct Dataset Entry Form</a></span>
                                </div>
                            </div>
                        </li>
                        <li class="u_margin-right-small">
                            <div class="nav_menu--container">
                                <a class="u--default-size nav_menu--handler" href="#">Tools</a>
                                <div class="nav_menu--siblings">
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/tools')"><a href="/nm#/tools">Module Tools</a></span>
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/simmtools')"><a href="/nm#/simmtools">Simulation Tools</a></span>
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/ChemProps')"><a href="/nm#/ChemProps">ChemProps</a></span>
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/CurationPlot')"><a href="/nm#/CurationPlot">Easy csv Plotter</a></span>
                                    <!--<span class="nav_menu--siblings-lists" @click="links('/nm#/pixelunit')"><a href="/nm#/pixelunit">Geometry Explorer</a></span>-->
                                </div>
                            </div>
                        </li>
                        <li class="u_margin-right-small" v-if="loginStatus">
                            <div class="nav_menu--container">
                                <a class="u--default-size" href="/nm#/mypage">My Portal</a>
                            </div>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
        <v-dialog v-model="logoutDialog" max-width="290">
            <v-card>
                <v-card-title class="headline blue lighten-2" primary-title>Log out</v-card-title>
                <v-card-text>
                    Log out of NanoMine?
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="blue darken-1" flat="flat" @click="cancelLogout()">
                    No
                </v-btn>

                <v-btn color="blue darken-1" flat="flat" href="/nmr/doLogout">
                    Yes
                </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="loginDialog" max-width="290">
            <v-card>
                <v-card-title class="headline blue lighten-2" primary-title>Login</v-card-title>
                <v-card-text>
                    Log into NanoMine?
                </v-card-text>
                <v-card-text>
                    If you already have a Duke University account, proceed to login.  Otherwise create a <a href="https://accounts.oit.duke.edu/onelink/register" target="_blank">Duke OneLink</a> account.
                    <br/><strong>Coming Soon:</strong> InCommon support for using your own university's credentials for login. <a href="https://www.incommon.org/federation/incommon-federation-participants/" target="_blank">What is InCommon?</a>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="blue darken-1" flat="flat" @click="$store.commit('resetLoginLogout')">
                    Cancel
                </v-btn>

                <v-btn color="blue darken-1" flat="flat" :href="getLoginLink()">
                    Login
                </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>
<style lang="scss">
    @import '../../css/new_style.scss';
</style>
<script>
    import AppMixin from './mixins'
    export default {
        name: 'Header',
        props: ['info'],
        mixins: [AppMixin],
    }
</script>