<template>
    <div class="visualize-pagination-container">
        <span>Page {{ currPage }}</span>
        <div class="visualize-pagination">
            <a href="#" @click.prevent="navigate('home')" class="visualize-pagination__desktop">Home</a>
            <a href="#" @click.prevent="navigate('prev')">Prev</a>
            <a href="#" @click.prevent="navigate('next')">Next</a>
            <a href="#" @click.prevent="navigate('end')" class="visualize-pagination__desktop">End</a>
        </div>
    </div>
</template>
<script>
    export default {
        name: "pagination",
        props: ['cpage', 'tpages', 'from', 'query', 'length'],
        data(){
            return {
                currPage: 1
            }
        },
        computed: {
            returnCurrentContentPage(){
                return this.currPage = this.$store.getters['imageSearch/returnCurrentContentPage']
            }
        },
        methods: {
            async navigate(arg){
                switch(arg){
                    case 'home':
                        this.currPage == 1 ? false : this.currPage = 1;
                        break;
                    case 'prev':
                        this.currPage >= 2 ? this.currPage = this.currPage - 1 : false;
                        break;
                    case 'next':
                        this.currPage += 1;
                        this.currPage * 10 > this.length ? this.loadMoreImages() : false;
                        break;
                    case 'end':
                        this.currPage == this.tpages ? false : this.currPage = this.tpages;
                        break;
                    default:
                        break;
                }
                
                await this.$store.commit('imageSearch/toggleCurrentContentPage', this.currPage)
                // if(this.from && this.from == 'settingspage'){
                //     return EventServices.$emit("settingpagination", EventServices.settingsPage)
                // } else {
                //     return EventServices.$emit("chartpagination", EventServices.currentPage)
                // }
            },
            async loadMoreImages(){
                await this.$store.dispatch('imageSearch/loadImages', {limit: this.currPage-1, query: this.query})
            }
        }
    }
</script>