<template>
    <div>
        <header class="header">
            <div class="wrapper">
                <div class="header-logo">
                    <div class="">
                        <img src="/nmstatic/img/logo.svg" alt="Materialsmine Logo">
                    </div>
                </div>
                <div class="nav_mobile-icon">
                    <div class="nav_mobile-icon-menu"></div>
                </div>
                <div class="header_nav">
                    <div class="nav nav_menu u--inline">
                        <ul>
                            <li><a href="/nm#/">NanoMine</a></li>
                            <li><a href="#">MetaMine</a></li>
                        </ul>
                    </div>
                    <div class="u--inline">
                        <a class="btn btn--tertiary btn--normal" href="#">Login/Register</a>
                        <!--<a class="btn btn--tertiary btn--normal" :href="getLoginLink()">Login/Register</a>-->
                    </div>
                </div>
            </div>
        </header>
        <div class="section_banner section_banner__misc">
            <div class="section_banner__text">
                <div class="section_banner__text-content">
                    <i :class="`fa ${info.icon}`"></i> <span class="u_adjust-banner-text">{{ info.name }}</span>
                </div>
            </div>
            <div class="section_banner__nav">
                <nav class="nav_menu">
                    <ul>
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
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/gallery')"><a href="/nm#/gallery">Explore Gallery</a></span>
                                </div>
                            </div>
                        </li>
                        <li class="u_margin-right-small">
                            <div class="nav_menu--container">
                                <a class="u--default-size nav_menu--handler" href="#">Upload</a>
                                <div class="nav_menu--siblings">
                                    <span class="nav_menu--siblings-lists" @click="links('/nm#/upload')"><a href="/nm#/upload">Xml-Based Upload</a></span>
                                    <span class="nav_menu--siblings-lists" @click="links('#')"><a href="#">Direct Dataset Entry Form</a></span>
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
                                </div>
                            </div>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
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
        // methods: {
        //     links(args) {
        //         return window.open(args, '_self');
        //     }
        // }
    }
</script>