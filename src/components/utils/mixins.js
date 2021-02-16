const AppMixin = {
    methods: {
        links(args) {
            return window.open(args, '_self');
        }
    }
}

export default AppMixin;