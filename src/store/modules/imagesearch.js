const SERVER = `${window.location.origin}/nmr/api`;

const state = {
    fetchedImage: [],
    filteredImage: [],
    responseError: false,
    errorMessage: null,
    queryType: 'default'
}

const getters =  {
    returnFetchedImages(state){
        // return state.fetchedImage && state.fetchedImage.length > 0
        return state.fetchedImage
    },
    returnResponseError(state){
        const { errorMessage, responseError } = state
        return {responseError, errorMessage}
    }
}

const mutations = {
    setResponseError(state, payload){
        state.responseError = payload.status
        state.errorMessage = payload.message
    },
    addFetchedImages(state, payload){
        state.fetchedImage = [...state.fetchedImage, ...payload]
        console.log(state.fetchedImage[0])
        console.log(state.fetchedImage)
    },
    resetFetchedImage(state){
        state.fetchedImage = []
    }
}

const actions = {
    async loadImages(context, payload) {
        context.commit('setResponseError', false);
        const response = await fetch(`${SERVER}/image_gallery_parser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: !payload.query ? 'defaultQuery':'imageQuery',
                query: payload.query
            })
        });
        const responseData = await response.json();
        if(response.status == 200){
            const processedData = responseData.data.map(el => {
                const imageURI = processImage(el.image)
                el.image = imageURI
                return el
            })
            context.commit('addFetchedImages', processedData)
        } else {
            const logError = {status: true, message: responseData.mssg}
            context.commit('setResponseError', logError)
        }
    }
}

const processImage = (arg) => {
    if(arg.charAt(0) == '/') return `data:image/jpg;base64,${arg}`
    if(arg.charAt(0) == 'i') return `data:image/png;base64,${arg}`
    if(arg.charAt(0) == 'R') return `data:image/gif;base64,${arg}`
    if(arg.charAt(0) == 'U') return `data:image/webp;base64,${arg}`
    if(arg.charAt(0) == 'T') return `data:image/tif;base64,${arg}`
    return
}

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions
}