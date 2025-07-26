export PATH="/miniconda/bin:$PATH"
export LSF_DOCKER_VOLUMES="/storage1/fs1/dinglab:/storage1/fs1/dinglab /scratch1/fs1/dinglab:/scratch1/fs1/dinglab /home/estorrs:/home/estorrs"
LSF_DOCKER_PORTS='8282:8888' bsub -R 'select[port8282=1] rusage[mem=50GB] span[hosts=1]' -M 50GB -q dinglab -G compute-dinglab -oo log.txt -a 'docker(estorrs/cosilico-py:0.0.1)' 'jupyter notebook --port 8888 --no-browser --ip=0.0.0.0'
