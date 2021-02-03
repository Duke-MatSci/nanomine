<template>
    <div class="section_footer">
        <div class="wrapper">
            <div class="grid grid_col-space-right grid_gap-smaller">
                <div class="footer_content u_toggle-display-off">
                    <img src="/nmstatic/img/logo.svg" class="footer_icon-img" alt="Materialsmine Logo">
                    <span class="footer_icon-text">&copy; 2020 Nanomine. All Rights Reserved.</span>
                </div>
                <div class="footer_content">
                    <div class="grid grid_col-3">
                        <div class="footer_list">
                            <ul>
                                <li><a href="/nm#/home_v2">Nanomine</a></li>
                                <li><a href="#">Metamine</a></li>
                            </ul>
                        </div>
                        <div class="footer_list">
                            <ul>
                                <li><a href="/nm#/teams">Teams</a></li>
                                <li><a href="/nm#/how">How To</a></li>
                                <li><a href="/nm#/news">Research News</a></li>
                            </ul>
                        </div>
                        <div class="footer_list">
                            <ul>
                                <li><a href="https://oarc.duke.edu/privacy/duke-university-privacy-statement" target="_blank">Privacy Policy</a></li>
                                <li><a href="https://security.duke.edu/node/82" target="_blank">Terms of Use</a></li>
                                <li><a href="/nm#/contactus">Contact Us</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <div class="footer_content-mobile">
                <img src="/nmstatic/img/logo.svg" class="footer_icon-img" alt="Materialsmine Logo">
                <span class="footer_icon-text">&copy; 2014-{{ new Date().getFullYear() }} Materialsmine. All Rights Reserved.</span>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    @import '../../css/new_style.scss';
</style>