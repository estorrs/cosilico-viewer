class AnnData(object):
    def __init__(self, X, obs, var):
        self.X = X
        self.obs = obs
        self.var = var