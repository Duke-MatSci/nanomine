## By Bingyin Hu, 03/19/2019
## rewritting myfun_plot.m in python

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import os

def plotEandEE(jobDir, experimental_file, data_file, eleNum):
	inc = 0.1
	logfreq = np.arange(-4, 6.1, 0.1)
	TS1 = 0.75;           # beta relaxation, s_beta, Tau shift. For tau <= 1, Shift multiplier along x direction. 1 is no shift
	DS1 = 10;             # beta relaxation, M_beta, DeltaEpsilonShiftFor tau <= 1, Shift multiplier along y direction. 1 is no shift
	TS2 = 0.02;           # Alpha relaxation, s_alpha, For tau > 1, Shift multiplier along x direction. 1 is no shift
	DS2 = 10;             # Alpha relaxation, M_alpha, For tau > 1, Shift multiplier along y direction. 1 is no shift
	CES = -0.28+0.6;      # ConstEpsilonShift
	# read input file
	ExptFreq = []
	ExptEp = []
	ExptEpp = []
	with open(os.path.join(jobDir, experimental_file), 'r') as f:
		rows = f.read().split("\n")
		for row in rows:
			expt = row.split()
			print(expt)
			ExptFreq.append(np.log10(float(expt[0])))
			ExptEp.append(float(expt[1]))
			ExptEpp.append(float(expt[2]))
	print(ExptFreq)
	# read XPR file
	mm = np.loadtxt(os.path.join(jobDir, data_file))
	NumOfDebyeTerms = eleNum + 1 # (Actual No. of Terms + 1) for eps_inf
	TemPR = np.zeros((NumOfDebyeTerms,2))
	eps_inf_add = -0.06
	TemPR[-1,1]= 2.25 + eps_inf_add # epsilon_inf
	TemPR[:(NumOfDebyeTerms - 1),1] = mm[:,3] # deltaEps
	TemPR[:(NumOfDebyeTerms - 1),0] = mm[:,0] # tau
	epsilon_inf = TemPR[NumOfDebyeTerms - 1, 1]
	# prepare ep and epp
	ep = np.zeros((logfreq.size, 1))
	epp = np.zeros((logfreq.size, 1))
	intep = np.zeros((logfreq.size, 1))
	intepp = np.zeros((logfreq.size, 1))
	# loop
	for j in range(logfreq.size):
		epsilonp = 0
		epsilonpp = 0
		intepsilonp = 0
		intepsilonpp = 0
		freq = 10**logfreq[j]
		for i in range(NumOfDebyeTerms-1):
			deltaEpsilon = TemPR[i, 1]
			tau = TemPR[i, 0]
			epsilonp = epsilonp + deltaEpsilon*((freq*tau)**2)/(1+((freq*tau)**2))
			epsilonpp = epsilonpp + deltaEpsilon*freq*tau/(1+((freq*tau)**2))
			if tau > 1:
				intepsilonp = intepsilonp + DS2*deltaEpsilon*TS2*freq*tau/(1+(TS2*freq*tau)**2)
				intepsilonpp = intepsilonpp + DS2*deltaEpsilon*TS2*freq*tau/(1+(TS2*freq*tau)**2)
			else:
				intepsilonp = intepsilonp + DS1*deltaEpsilon*TS1*freq*tau/(1+(TS1*freq*tau)**2)
				intepsilonpp = intepsilonpp + DS1*deltaEpsilon*TS1*freq*tau/(1+(TS1*freq*tau)**2)
		# epsilonp = epsilonp
		intepsilonp = intepsilonp + epsilon_inf + CES
		ep[j] = epsilonp
		epp[j] = epsilonpp
		intep[j] = intepsilonp
		intepp[j] = intepsilonpp
	# Plot prony series prediction and expt values
	plt.figure()
	plt.plot(logfreq, np.log10(ep), label = "Fitted Debye series")
	plt.plot(ExptFreq, np.log10(ExptEp), marker=(8,2,0), linestyle='', label = "Experiment", color = 'r')
	plt.xlabel('log(Frequency [Hz])')
	plt.xlim(ExptFreq[0]+0.5, ExptFreq[-1]-0.5)
	plt.ylabel(r"$\epsilon'$")
	plt.legend()
	plt.savefig(os.path.join(jobDir, "E.png"))
	# plt.close(0)

	plt.figure()
	plt.plot(logfreq, np.log10(epp), label = "Fitted Debye series")
	plt.plot(ExptFreq, np.log10(ExptEpp), marker=(8,2,0), linestyle='', label = "Experiment", color = 'r')
	plt.xlabel('log(Frequency [Hz])')
	plt.xlim(ExptFreq[0]+0.5, ExptFreq[-1]-0.5)
	plt.ylabel(r"$\epsilon''$")
	plt.legend()
	plt.savefig(os.path.join(jobDir, "EE.png"))
	# plt.close(1)
