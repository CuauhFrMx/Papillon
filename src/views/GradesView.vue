<script>
	import { defineComponent } from 'vue';
	import {
		IonHeader,
		IonContent,
		IonToolbar,
		IonTitle,
		IonMenuButton,
		IonPage,
		IonButtons,
		IonList,
		IonListHeader,
		IonLabel,
		IonItem,
		IonCard,
		IonSkeletonText,
		IonSegment,
		IonSegmentButton,
		IonModal,
		IonSearchbar,
		IonSpinner
	} from '@ionic/vue';

	import displayToast from '@/functions/utils/displayToast.js';

	import GetGrades from '@/functions/fetch/GetGrades.js';
	import ChangePeriod from '@/functions/login/ChangePeriod.js';

	import { Share } from '@capacitor/share';

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
			IonCard,
			IonItem,
			IonLabel,
			IonList,
			IonModal,
			IonListHeader,
			IonSkeletonText,
			IonSegment,
			IonSegmentButton,
			IonSearchbar,
			IonSpinner
		},
		data() {
			return {
				grades: [],
				fullGrades: [],
				averages: [],
				classAverages: [],
				isLoading: false,
				periods: [],
				current_period: [],
				base_period: [],
				segChangeTimeout: false,
				changePeriodSelection: localStorage.getItem('changePeriodSelection') == "true" ? true : false,
				selectedMark: {
					subject: "",
					average: 0,
					class_average: 0,
					max_average: 0,
					min_average: 0,
					out_of: 0,
				},
				selectedGrade: [],
				selectedGradeSet: false,
				out_of_20: localStorage.getItem('tweakGrades20') == "true" ? true : false,
			}
		},
		methods: {
			getPeriods() {
				let allPeriods = JSON.parse(localStorage.getItem('userData')).periods;

				// find period with actual = true
				let actualPeriod = allPeriods.find(period => period.actual == true);

				if (localStorage.getItem('currentPeriod')) {
					actualPeriod = JSON.parse(localStorage.getItem('currentPeriod'));
				}

				this.current_period = actualPeriod;
				this.base_period = actualPeriod;

				// if first period contains "Trimestre", add all trimesters
				if (actualPeriod.name.includes("Trimestre")) {
					for (let i = 0; i < allPeriods.length; i++) {
						if (allPeriods[i].name.includes("Trimestre")) {
							this.periods.push(allPeriods[i]);
						}
					}
				}

				// if first period contains "Semestre", add all semesters
				if (actualPeriod.name.includes("Semestre")) {
					for (let i = 0; i < allPeriods.length; i++) {
						if (allPeriods[i].name.includes("Semestre")) {
							this.periods.push(allPeriods[i]);
						}
					}
				}
			},
			segChange() {
				if (!this.segChangeTimeout) {
					let newSegment = this.$refs.segment.$el.value;

					// get corresponding period name from id
					let newPeriod = this.periods.find(period => period.id == newSegment);

					// save in localstorage
					localStorage.setItem('currentPeriod', JSON.stringify(newPeriod));

					// change current period
					ChangePeriod(newPeriod.name).then(() => {
							this.getGradesRefresh(true);
							this.current_period = newPeriod;
						})
						.catch(() => {
							this.$refs.segment.$el.value = this.base_period.id;
						});
				}
			},
			openAverageModal(subject) {
				this.selectedMark = {
					subject: subject.name,
					average: subject.average,
					class_average: subject.class.average,
					max_average: subject.class.max,
					min_average: subject.class.min,
					out_of: 20,
					grouped: subject.grouped,
					excluded: subject.grpExcluded,
				}

				this.$refs.averageModal.$el.present(subject);
			},
			editMarks(grades) {
				let out_of_20 = this.out_of_20;

				grades.forEach(subject => {
					subject.marks.forEach(mark => {
						// if out of 20 make it out of 20
						if (out_of_20) {
							mark.grade.updated_value = parseFloat(mark.grade.value) / parseFloat(
								mark.grade.out_of) * 20;

							mark.grade.updated_value = mark.grade.updated_value.toFixed(2);
							mark.grade.updated_out_of = 20;
						}
					});
				});

				return grades;
			},
			setExcludedJoinSubject(subjectName) {
				let excludedGroupSubjects = localStorage.getItem('excludedGroupSubjects');
				subjectName = subjectName.split(" > ")[0].trim();
				excludedGroupSubjects = JSON.parse(excludedGroupSubjects) || [];

				// Set subject as excluded if not already and remove it from excludedGroupSubjects if it is
				if (excludedGroupSubjects.includes(subjectName)) {
					excludedGroupSubjects.splice(excludedGroupSubjects.indexOf(subjectName), 1);
					displayToast.presentToast("Cette matière sera désormais regroupé.", "success");
				} else {
					excludedGroupSubjects.push(subjectName);
					displayToast.presentToast("Cette matière ne sera désormais plus regroupé.", "warning");
				}

				localStorage.setItem('excludedGroupSubjects', JSON.stringify(excludedGroupSubjects));
				this.getGradesRefresh();
				this.$refs.averageModal.$el.dismiss();
			},
			getGradesRefresh(fromSegChange) {
				if (fromSegChange) {
					this.segChangeTimeout = true;
					this.isLoading = true;
				}

				GetGrades(true).then((data) => {
					if (fromSegChange) {
						this.segChangeTimeout = false;

						this.isLoading = false;
					}

					this.grades = this.editMarks(data.marks);
					this.fullGrades = this.editMarks(data.marks);

					this.averages = data.averages;
					this.isLoading = false;

					this.classAverages = data.averages.class;
				})
			},
			getStringToAsciiArray(string) {
				let charCodeArr = [];
				for(let i = 0; i < string.length; i++){
					let code = string.charCodeAt(i);
					charCodeArr.push(code);
				}

				return charCodeArr;
			},
			async shareGrade(grade, color) {
				let sharedGrade = {
					grade: {
						value: grade.grade.value,
						out_of: grade.grade.out_of,
						max: grade.grade.max,
						min: grade.grade.min,
						coefficient: grade.grade.coefficient,
						average: grade.grade.average,
					},
					info: {
						subject: grade.info.subject,
						description: grade.info.description,
						...grade.info
					},

					color: color
				}

				// get first name of user
				let firstName = JSON.parse(localStorage.getItem("userData")).student.name;
				firstName = firstName.split(" ")[firstName.split(" ").length - 1];

				// if custom name is set, use it instead
				if(localStorage.getItem("customName")) {
					firstName = localStorage.getItem("customName").split(" ")[localStorage.getItem("customName").split(" ").length - 1];
				}

				// Set customizable data to ascii
				firstName = this.getStringToAsciiArray(firstName).join('-');
				sharedGrade.info.subject = this.getStringToAsciiArray(sharedGrade.info.subject).join('-');
				sharedGrade.info.description = this.getStringToAsciiArray(sharedGrade.info.description).join('-');

				let urlElems = "";

				// Datas
				urlElems += firstName + "$"; // first name
				urlElems += sharedGrade.info.subject + "$";
				urlElems += sharedGrade.info.description + "$";
				urlElems += sharedGrade.info.outOf20 + "$";
				urlElems += sharedGrade.info.bonus + "$";
				urlElems += sharedGrade.info.optional + "$";
				urlElems += sharedGrade.info.significant + "$";
				urlElems += sharedGrade.info.significantReason + "$";
				urlElems += sharedGrade.info.significantZero + "$";
				urlElems += sharedGrade.info.significantAverage + "$";
				urlElems += sharedGrade.info.date + "$";
				urlElems += color + "$";

				// Grade
				urlElems += sharedGrade.grade.value + "$";
				urlElems += sharedGrade.grade.out_of + "$";
				urlElems += sharedGrade.grade.coefficient + "$";
				urlElems += sharedGrade.grade.average + "$";
				urlElems += sharedGrade.grade.max + "$";
				urlElems += sharedGrade.grade.min;

				// base64 encode urlElems
				let url = "https://getpapillon.xyz/grade?g=" + btoa(urlElems);

				// share url
				await Share.share({
					url: url,
					dialogTitle: "Partager votre note de " + sharedGrade.info.subject
				});
			},
			handleRefresh(event) {
				// get new Grades data
				this.getGradesRefresh()

				// stop refresh when this.grades is updated
				this.$watch('grades', () => {
					setTimeout(() => {
						event.target.complete();
					}, 200);
				});
			},
			searchGrades() {
				let search1 = this.$refs.searchBarIos.$el.value;
				let search2 = this.$refs.searchBarMd.$el.value;


				if (search1 == "" && search2 == "") {
					this.grades = this.fullGrades;
				} else {
					let search = search1 == "" ? search2 : search1;
					this.grades = this.fullGrades.filter(subject => {
						return subject.name.toLowerCase().includes(search.toLowerCase());
					});
				}
			},
			openGradeModal(mark, color) {
				this.selectedGrade = mark;

				this.selectedGrade.color = color;

				this.selectedGradeSet = true;
				this.$refs.gradeModal.$el.present();
			},
		},
		mounted() {
			this.isLoading = true;

			GetGrades().then((data) => {
				this.grades = this.editMarks(data.marks);
				this.fullGrades = this.editMarks(data.marks);

				this.averages = data.averages;
				this.isLoading = false;

				this.classAverages = data.averages.class;
			});

			this.getPeriods();

			document.addEventListener('tokenUpdated', () => {
				GetGrades().then((data) => {
					this.grades = this.editMarks(data.marks);
					this.fullGrades = this.editMarks(data.marks);
					this.averages = data.averages;
					this.isLoading = false;

					this.classAverages = data.averages.class;
				});
			});

			document.addEventListener('settingsUpdated', () => {
				GetGrades().then((data) => {
					this.out_of_20 = localStorage.getItem('tweakGrades20') == "true" ? true :
					false;
					this.grades = this.editMarks(data.marks);
					this.fullGrades = this.editMarks(data.marks);
					this.averages = data.averages;
					this.isLoading = false;

					this.classAverages = data.averages.class;
				});

				this.changePeriodSelection = localStorage.getItem('changePeriodSelection') == "true" ?
					true : false;
			});
		}
	});
</script>

<template>
	<ion-page ref="page">
		<IonHeader class="AppHeader" translucent>
			<IonToolbar>

				<ion-buttons slot="start">
					<ion-menu-button color="dark" mode="md"></ion-menu-button>
				</ion-buttons>

				<ion-title mode="md">Notes</ion-title>

				<ion-spinner slot="end" v-if="isLoading"></ion-spinner>
			</IonToolbar>
			<IonToolbar class="only-md">
				<IonSearchbar ref="searchBarMd" placeholder="Chercher une matière..." @ionChange="searchGrades()">
				</IonSearchbar>
			</IonToolbar>
		</IonHeader>

		<ion-content :fullscreen="true">
			<ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
				<ion-refresher-content></ion-refresher-content>
			</ion-refresher>

			<IonHeader collapse="condense">
				<IonToolbar>
					<ion-title size="large">Notes</ion-title>
				</IonToolbar>
				<IonToolbar>
					<IonSearchbar ref="searchBarIos" placeholder="Chercher une matière..." @ionChange="searchGrades()">
					</IonSearchbar>
				</IonToolbar>
			</IonHeader>

			<div id="noTouchZone"></div>

			<ion-segment v-if="periods.length > 0 && changePeriodSelection" id="segment" :value="current_period.id"
				ref="segment" @ionChange="segChange()">
				<ion-segment-button v-for="(period, i) in periods" :key="i" :value="period.id" :id="period.id">
					<ion-label>{{period.name}}</ion-label>
				</ion-segment-button>
			</ion-segment>

			<div v-if="isLoading">
				<ion-card class="subject" v-for="i in 6" v-bind:key="i">
					<div class="subject-name" style="padding: 15px 15px">
						<ion-skeleton-text :animated="true" style="width: 50%;"></ion-skeleton-text>
						<ion-skeleton-text class="avg" :animated="true" style="width: 20%;"></ion-skeleton-text>
					</div>
					<div class="grades">
						<ion-card class="grade" v-for="i in 3" v-bind:key="i">
							<div class="myGrade" style="width: 135px;">
								<ion-skeleton-text :animated="true" style="width: 50%;"></ion-skeleton-text>
								<br />
								<ion-skeleton-text :animated="true" style="width: 40%;"></ion-skeleton-text>
							</div>
							<div class="grades">
								<ion-skeleton-text class="average" :animated="true"></ion-skeleton-text>

								<ion-skeleton-text class="average" :animated="true"></ion-skeleton-text>

								<ion-skeleton-text class="average" :animated="true"></ion-skeleton-text>
							</div>
						</ion-card>
					</div>
				</ion-card>
			</div>

			<ion-card class="subject" v-for="(subject, index) in grades" v-bind:key="index"
				:style="`--backgroundTheme: ${ subject.color };`">
				<div class="subject-name" @click="openAverageModal(subject)">
					<h3>
						{{subject.name}}
						<span class="material-symbols-outlined mdls" v-if="subject.grouped">join_inner</span>
					</h3>
					<p class="avg" v-if="subject.significant">{{subject.average.toFixed(2)}}<small>/20</small></p>
					<p class="avg" v-if="!subject.significant">{{subject.significantReason}}<small>/20</small></p>
				</div>

				<div class="grades">

					<ion-card class="grade" v-for="(mark, i) in subject.marks" v-bind:key="i" @click="openGradeModal(mark, subject.color)">
						<div class="myGrade">
							<p class="name">{{ mark.info.description }}</p>
							<p class="coef">Coeff. : {{mark.grade.coefficient}}</p>

							<p class="grd main" v-if="mark.info.significant && !mark.grade.updated_value">
								{{mark.grade.value}}<small>/{{mark.grade.out_of}}</small></p>
							<p class="grd main" v-else-if="mark.grade.updated_value && mark.info.significant">
								{{mark.grade.updated_value}}<small>/{{mark.grade.updated_out_of}}</small></p>
							<p class="coef" v-if="mark.grade.updated_value && mark.info.significant">
								{{mark.grade.value}}<small>/{{mark.grade.out_of}}</small></p>

							<!-- si absent -->
							<p class="grd main" v-if="!mark.info.significant">
								{{ mark.info.significantReason }}<small>/{{mark.grade.out_of}}</small></p>
							<p class="coef" v-if="mark.grade.updated_value && !mark.info.significant"><br /></p>
						</div>
						<div class="averages" v-if="mark.info.significantAverage">
							<div class="average">
								<p class="grd">{{mark.grade.min}}<small>/{{mark.grade.out_of}}</small></p>
								<p>Min.</p>
							</div>

							<div class="average class">
								<p class="grd">{{mark.grade.average}}<small>/{{mark.grade.out_of}}</small></p>
								<p>Classe</p>
							</div>

							<div class="average">
								<p class="grd">{{mark.grade.max}}<small>/{{mark.grade.out_of}}</small></p>
								<p>Max.</p>
							</div>
						</div>

						<div class="averages" v-if="!mark.info.significantAverage">
							<div class="average unique">
								<p class="grd">{{ mark.info.significantReason }}</p>
								<p>Classe</p>
							</div>
						</div>

					</ion-card>

				</div>
			</ion-card>

			<div v-if="!isLoading">
				<div class="NoCours" v-if="this.grades.length == 0">
					<span class="material-symbols-outlined mdls">insights</span>
					<h2>Pas de notes ajoutées pour cette période</h2>
					<p>Réesayez avec une autre période à l'aide du sélecteur.</p>
				</div>
			</div>

			<IonList v-if="this.grades.length != 0">
				<IonListHeader>
					<IonLabel>
						<h2>Moyennes</h2>
					</IonLabel>
				</IonListHeader>

				<IonItem>
					<span class="material-symbols-outlined mdls" slot="start">person</span>
					<IonLabel>
						<p>Moyenne générale</p>
						<h2>{{ averages.average.toFixed(2) }}<small>/20</small></h2>
					</IonLabel>
				</IonItem>
				<IonItem>
					<span class="material-symbols-outlined mdls" slot="start">groups</span>
					<IonLabel>
						<p>Moyenne de classe</p>
						<h2>{{ classAverages.average.toFixed(2) }}<small>/20</small></h2>
					</IonLabel>
				</IonItem>
				<div style="display:flex">
					<IonItem>
						<span class="material-symbols-outlined mdls" slot="start">swap_vert</span>
						<IonLabel>
							<p>Meilleure moyenne</p>
							<h2>{{ classAverages.max.toFixed(2) }}<small>/20</small></h2>
						</IonLabel>
					</IonItem>
					<IonItem>
						<IonLabel>
							<p>Moins bonne moyenne</p>
							<h2>{{ classAverages.min.toFixed(2) }}<small>/20</small></h2>
						</IonLabel>
					</IonItem>
				</div>
			</IonList>

			<br /> <br />

			<IonModal ref="gradeModal" :keep-contents-mounted="true" :initial-breakpoint="0.5"
				:breakpoints="[0, 0.5, 0.9]" :handle="true" :canDismiss="true">
				<IonHeader>
					<IonToolbar class="markToolbar">
						<ion-label v-if="selectedGradeSet">
							<h2>Note en {{ selectedGrade.info.subject }}</h2>
							<p>{{ new Date(selectedGrade.info.date).toLocaleString('fr-FR', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) }}</p>
						</ion-label>

						<ion-buttons slot="end">
							<IonButton @click="shareGrade(selectedGrade, selectedGrade.color)">
								<span class="material-symbols-outlined mdls">ios_share</span>
							</IonButton>
						</ion-buttons>
					</IonToolbar>
				</IonHeader>
				<ion-content>
					<ion-list v-if="selectedGradeSet">
						<ion-item>
							<span class="material-symbols-outlined mdls" slot="start">face</span>
							<ion-label>
								<p>Note de l'élève</p>
								<h2>{{ parseFloat(selectedGrade.grade.value).toFixed(2) }}<small>/{{ selectedGrade.grade.out_of }}</small></h2>
							</ion-label>

							<ion-item slot="end" lines="none">
								<span class="material-symbols-outlined mdls" slot="start">percent</span>
								<ion-label>
									<p>Coefficient</p>
									<h2>{{selectedGrade.grade.coefficient}}</h2>
								</ion-label>
							</ion-item>
						</ion-item>
						<ion-item>
							<span class="material-symbols-outlined mdls" slot="start">groups</span>
							<ion-label>
								<p>Note de la classe</p>
								<h2>{{ parseFloat(selectedGrade.grade.average).toFixed(2) }}<small>/{{ selectedGrade.grade.out_of }}</small></h2>
							</ion-label>
						</ion-item>
						<ion-item>
							<span class="material-symbols-outlined mdls" slot="start">person_remove</span>
							<ion-label>
								<p>Note la plus basse</p>
								<h2>{{ parseFloat(selectedGrade.grade.min).toFixed(2) }}<small>/{{ selectedGrade.grade.out_of }}</small></h2>
							</ion-label>
						</ion-item>
						<ion-item>
							<span class="material-symbols-outlined mdls" slot="start">person_add</span>
							<ion-label>
								<p>Note la plus haute</p>
								<h2>{{ parseFloat(selectedGrade.grade.max).toFixed(2) }}<small>/{{ selectedGrade.grade.out_of }}</small></h2>
							</ion-label>
						</ion-item>
					</ion-list>
				</ion-content>
			</IonModal>

			<IonModal ref="averageModal" :keep-contents-mounted="true" :initial-breakpoint="0.5"
				:breakpoints="[0, 0.5, 0.9]" :handle="true" :canDismiss="true">
				<IonHeader>
					<IonToolbar>
						<ion-title>{{ selectedMark.subject }}</ion-title>
					</IonToolbar>
				</IonHeader>
				<ion-content>
					<ion-list>
						<ion-item>
							<span class="material-symbols-outlined mdls" slot="start">face</span>
							<ion-label>
								<p>Ma moyenne</p>
								<h2>{{ selectedMark.average }}<small>/20</small></h2>
							</ion-label>
						</ion-item>

						<ion-item>
							<span class="material-symbols-outlined mdls" slot="start">groups</span>
							<ion-label>
								<p>Moyenne de classe</p>
								<h2>{{ selectedMark.class_average }}<small>/20</small></h2>
							</ion-label>
						</ion-item>

						<ion-item>
							<span class="material-symbols-outlined mdls" slot="start">person_remove</span>
							<ion-label>
								<p>Moyenne la plus basse</p>
								<h2>{{ selectedMark.min_average }}<small>/20</small></h2>
							</ion-label>
						</ion-item>

						<ion-item>
							<span class="material-symbols-outlined mdls" slot="start">person_add</span>
							<ion-label>
								<p>Moyenne la haute</p>
								<h2>{{ selectedMark.max_average }}<small>/20</small></h2>
							</ion-label>
						</ion-item>

						<ion-item v-if="selectedMark.grouped">
							<span class="material-symbols-outlined mdls" slot="start">join_inner</span>
							<ion-label class="ion-text-wrap">
								<p>Combinaison</p>
								<h3>Cette matière est un regroupement de plusieurs matières.</h3>
							</ion-label>

							<ion-button class="itemBtn" fill="clear" slot="end"
								@click="setExcludedJoinSubject(selectedMark.subject)">
								<span class="material-symbols-outlined mdls" slot="start">visibility_off</span>
								Ne pas regrouper
							</ion-button>
						</ion-item>

						<ion-item v-else-if="selectedMark.excluded">
							<span class="material-symbols-outlined mdls" slot="start">join</span>
							<ion-label class="ion-text-wrap">
								<p>Exclue</p>
								<h3>Cette matière n'est actuellement pas regroupée</h3>
							</ion-label>

							<ion-button class="itemBtn" fill="clear" slot="end"
								@click="setExcludedJoinSubject(selectedMark.subject)">
								<span class="material-symbols-outlined mdls" slot="start">visibility</span>
								Regrouper
							</ion-button>
						</ion-item>
					</ion-list>
				</ion-content>
			</IonModal>

		</ion-content>
	</ion-page>
</template>

<style scoped>
	.subject-name {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 15px;
		background: linear-gradient(90deg, #00000055 0%, #00000055 100%), var(--backgroundTheme);
	}

	.subject-name * {
		margin: 0;
		padding: 0;
		color: #fff;
	}

	.subject-name h3 {
		font-size: 1rem;
		font-weight: 500;
	}

	.subject-name h3 span {
		margin-left: 5px;
		font-size: 0.8rem;
		font-weight: 400;
		vertical-align: middle;
		opacity: 60%;
	}

	.subject-name p {
		font-size: 1rem;
		font-weight: 400;
	}

	.subject-name p small {
		font-size: 0.8rem;
		font-weight: 400;
		opacity: 50%;
	}

	.grades * {
		margin: 0;
		padding: 0;
	}

	.grades {
		padding: 15px 15px;
		display: flex;
		gap: 15px;
		overflow-y: scroll;
	}

	.grade {
		width: 100%;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		min-width: fit-content;
		max-width: fit-content;
		isolation: isolate;
		overflow: hidden;
	}

	.dark .grade {
		background: var(--ion-color-step-50);
	}

	.myGrade {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		border-bottom: 1px solid var(--ion-color-step-100);
		padding: 10px 10px;
	}

	.myGrade p.grd {
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--ion-text-color);
		margin-top: 5px;
		font-family: var(--papillon-font) !important;
	}

	.myGrade p.name {
		font-size: 1rem;
		font-weight: 500;
		color: var(--ion-text-color);
		width: 130px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.myGrade p.coef {
		font-size: 0.8rem;
		font-weight: 400;
		opacity: 50%;
	}

	.myGrade .grd small {
		font-size: 1rem;
		font-weight: 400;
		opacity: 50%;
	}

	.averages {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 10px;
		gap: 10px;
	}

	.average {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
	}

	.average p.grd {
		font-size: 1rem;
		font-weight: 500;
		color: var(--ion-text-color);
		font-family: var(--papillon-font) !important;
	}

	.average p.grd small {
		font-size: 0.8rem;
		font-weight: 400;
		opacity: 50%;
	}

	.average p:not(.grd) {
		font-size: 0.8rem;
		font-weight: 400;
		opacity: 50%;
	}

	.average.unique {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
	}

	.ios .grade {
		border: 1px solid var(--ion-color-step-50);
		border-radius: 8px;
	}

	.ios .myGrade {
		border: none;
		background: linear-gradient(90deg, #00000055 0%, #00000055 100%), var(--backgroundTheme);
	}

	.ios .myGrade * {
		color: #fff !important;
	}

	.ios #segment {
		width: calc(100vw - 24px);
		margin: 0 12px;
	}

	.md .grade {
		border: 1px solid var(--ion-color-step-150);
		--background: none;
		box-shadow: none;
		border-radius: 8px;
	}

	ion-spinner {
		margin-right: 20px;
	}

	.markToolbar {
		margin: 0 !important;
	}

	.markToolbar ion-label * {
		text-align: center;
		margin: 0;
	}

	.markToolbar h2 {
		margin-top: 7px !important;
	}

	.markToolbar p {
		margin-bottom: 2px !important;
	}
</style>