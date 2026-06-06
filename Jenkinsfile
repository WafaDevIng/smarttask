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
                 echo 'build sucess'
                }
        }

        stage('Run') {
            steps {
                 echo 'runing'
            }
        }

    }

    post {
        always {
            echo 'Pipeline terminé'
        }
    }
}