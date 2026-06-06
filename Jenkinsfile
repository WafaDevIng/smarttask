pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                git branch: 'master',
                    url: 'https://github.com/WafaDevIng/smarttask.git'
            }
        }

        stage('Build') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Run') {
            steps {
                sh 'docker compose up -d'
            }
        }

    }

    post {
        always {
            echo 'Pipeline terminé'
        }
    }
}