FROM --platform=linux/amd64 ubuntu:20.04

RUN apt-get update && apt-get install -y vim wget curl git

RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda.sh
RUN bash ~/miniconda.sh -b -p /miniconda
ENV PATH="/miniconda/bin:$PATH"

RUN conda install -y -c conda-forge jupyter jupyter_contrib_nbextensions python poetry

COPY . /src

RUN poetry install --directory /src

CMD /bin/bash
