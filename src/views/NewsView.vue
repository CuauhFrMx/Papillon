<script>
    import { defineComponent } from 'vue';
    import { IonHeader, IonContent, IonToolbar, IonTitle, IonMenuButton, IonPage, IonButtons, IonButton, IonList, IonLabel, IonItem, IonModal, IonSpinner, IonSearchbar } from '@ionic/vue';
    
    import { Browser } from '@capacitor/browser';

    import GetNews from '@/functions/fetch/GetNews.js';

    export default defineComponent({
        name: 'FolderPage',
        components: {
            IonHeader,
            IonContent,
            IonToolbar,
            IonTitle,
            IonMenuButton,
            IonPage,
            IonButtons,
            IonButton,
            IonItem,
            IonLabel,
            IonModal,
            IonList,
            IonSpinner,
            IonSearchbar
        },
        data() {
            return { 
                news: [],
                fullNews: [],
                openedNews: [],
                presentingElement: null,
                isLoading: false,
                newsOpen: false,
            }
        },
        methods: {
            openNews(news) {
                this.openedNews = news;
                
                // open modal with ref
                this.newsOpen = true;
            },
            closeNews() {
                this.newsOpen = false;
            },
            async openLink(url) {
                await Browser.open({
                    url: url
                });
            },
            getNewsRefresh() {
                GetNews(true).then((data) => {
                    this.news = data;
                })
            },
            searchNews() {
                let search1 = this.$refs.searchBarIos.$el.value;
                let search2 = this.$refs.searchBarMd.$el.value;
                let news = this.fullNews;

                if (search1 == "" && search2 == "") {
                    this.news = news;
                } else {
                    let search = search1 == "" ? search2 : search1;
                    // filter news by name, content and author
                    let filteredNews = news.filter((news) => {
                        return news.title.toLowerCase().includes(search.toLowerCase()) || news.content.toLowerCase().includes(search.toLowerCase()) || news.author.toLowerCase().includes(search.toLowerCase());
                    });

                    this.news = filteredNews;
                }
            },
            handleRefresh(event) {
                // get new News data
                this.getNewsRefresh()

                // stop refresh when this.news is updated
                this.$watch('news', () => {
                    setTimeout(() => {
                        event.target.complete();
                    }, 200);
                });
            },
        },
        mounted() {
            this.presentingElement = this.$refs.page.$el;

            this.isLoading = true;
            GetNews().then((data) => {
                this.news = data;
                this.fullNews = data;
                
                this.isLoading = false;
            });

            document.addEventListener('tokenUpdated', () => {
                this.getNewsRefresh();
            });

            return false;
        }
    });
</script>

<template>
    <ion-page ref="page">
      <IonHeader class="AppHeader" collapse="fade" translucent>
        <IonToolbar>

          <ion-buttons slot="start">
            <ion-menu-button color="dark" mode="md"></ion-menu-button>
          </ion-buttons>

          <ion-title mode="md">Actualités</ion-title>
        </IonToolbar>
        <IonToolbar class="only-md">
            <ion-searchbar ref="searchBarMd" placeholder="Rechercher une actualité, une personne..." @ionChange="searchNews()"></ion-searchbar>
        </IonToolbar>
      </IonHeader>
      
      <ion-content :fullscreen="true">
        <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
            <ion-refresher-content></ion-refresher-content>
        </ion-refresher>

        <IonHeader collapse="condense">
            <IonToolbar>
                <ion-title size="large">Actualités</ion-title>
            </IonToolbar>
            <IonToolbar>
                <IonSearchbar ref="searchBarIos" placeholder="Rechercher une actualité, une personne..." @ionChange="searchNews()"></IonSearchbar>
            </IonToolbar>
        </IonHeader>

        <div class="NoCours" v-if="news.length == 0 && isLoading">
            <IonSpinner></IonSpinner>
            <br/>
            <h2>Téléchargement des actualités...</h2>
            <p>Veuillez patienter pendant qu'on récupère les actualités depuis nos serveurs...</p>
        </div>

        <div class="NoCours" v-if="news.length == 0 && !isLoading">
            <span class="material-symbols-outlined mdls">feed</span>
            <h2>Aucune actualité n'a été trouvée.</h2>
            <p>Revenez plus tard ou essayer de rafraîchir.</p>
        </div>

        <IonList>
            <IonItem button v-for="(news, i) in news" v-bind:key="i" @click="openNews(news)">
                <span v-if="!news.isSurvey" class="material-symbols-outlined mdls" slot="start">feed</span>
                <span v-if="news.isSurvey" class="material-symbols-outlined mdls" slot="start">contact_support</span>
                    <IonLabel>
                        <h2>{{ news.title }}</h2>
                        <p>{{ news.author }} - {{ news.category }}</p>
                        <small>{{ news.dateString }}</small>
                    </IonLabel>
            </IonItem>
        </IonList>

        <IonModal :is-open="newsOpen" :presenting-element="presentingElement" :canDismiss="true" ref="modal">
            <IonHeader translucent>
                <IonToolbar>
                    <IonTitle>{{ openedNews.title }}</IonTitle>
                    <IonButtons slot="end">
                        <IonButton @click="closeNews()">Fermer</IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent class="newsModalContent ion-padding">
                <h1>{{ openedNews.title }}</h1>
                <small>de {{ openedNews.author }} - {{ openedNews.dateString }}</small>
                <div v-if="openedNews.isSurvey">
                    <IonItem class="survey-warning" lines="none">
                        <span class="material-symbols-outlined mdls" slot="start">error</span>
                        <IonLabel>
                            <h2>Impossible de répondre</h2>
                            <p>Vous ne pouvez pas répondre à un sondage depuis Papillon, merci de vous rentre sur votre service scolaire pour répondre.</p>
                        </IonLabel>
                    </IonItem>
                </div>
                <hr v-else />
                <div class="newsModalContentContent" v-html="openedNews.htmlContent"></div>

                <div class="chips" v-if="openedNews.attachments.length !== 0">
                    <ion-chip v-for="(attachment, i) in openedNews.attachments" :key="i" @click="openLink(attachment.url, attachment.name)" color="dark" :outline="true">
                        <span v-if="attachment.type == 1" class="material-symbols-outlined mdls">description</span>

                        <span v-if="attachment.type == 0" class="material-symbols-outlined mdls">link</span>

                        <p>{{attachment.name}}</p>
                    </ion-chip>
                </div>
            </IonContent>
        </IonModal>
      </ion-content>
    </ion-page>
</template>
  
<style scoped>
    .ios .only-md {
        display: none;
    }

    .newsModalContent * {
        margin: 0;
    }

    .newsModalContent hr {
        margin: 15px 0px;
        background: #000;
        opacity: 25%;
    }

    .newsModalContent .chips {
        margin-top: 20px !important;
        margin-bottom: 20px !important;

        display: flex;
        flex-wrap: wrap;
    }

    .newsModalContent .chips ion-chip {
        margin-right: 5px;
        margin-bottom: 5px;
    }

    .newsModalContent .chips span {
        opacity: 50%;
        margin-right: 8px;
    }

    .newsModalContent .chips ion-chip p {
        max-width: 160px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .dark .newsModalContent hr {
        background: #fff !important;
    }

    .newsModalContent h1 {
        font-size: 1.5em;
        font-weight: 300 !important;
    }

    .newsModalContent small {
        font-size: 0.9em;
        font-weight: 400;
        opacity: 0.5;
    }

    .newsModalContentContent {
        zoom: 1.2;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }

    .survey-warning {
        margin: 25px 0px;
        color: var(--ion-color-danger);
        --background: var(--ion-color-danger-dark);
    }

    .survey-warning p {
        white-space: pre-line;
    }

    .survey-warning::part(native) {
        padding: 10px 18px;
        border-radius: 11px;
    }
</style>
