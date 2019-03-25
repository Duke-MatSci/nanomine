/*************************************************************************************

	DYNAMFIT.C

	Roger D. Bradshaw
	Northwestern University
	Code Completed: 18 Nov 1996
	Code Updated: 12 March 1998	Changed to Visual C++ and used new functions to
											simplify the code considerably.
	Code Updated: 12 July 2011 Finished changes started in 1998 
									(including kbhit to _kbhit and getch to _getch)

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This program begins by getting a DOS acceptable 8 char project name (#) from input.
	It will the read the data files.  These are either:

		1) A single file #.X_T containing Frequency  X'  X"
		2) Two different files
			- #.XP containing Frequency X'
			- #.XPP containing Frequency X"
			- The frequencies above need not be the same in XP and XPP

	The user then will be asked:

		1) How many Prony elements are to be used
		2) The value of gamma1 (for TauMin) and gamma2 (for TauMax)
		3) Whether this is compliance or modulus data (sets Sign_GJ)
		4) The weighting parameter (0-1) - will double inside the code

	Definitionally, a Prony series of N elements in this code is:

		XProny (t) = X0 + Sign_GJ * [(Sum i = 1 to N-1) of X_i * exp (- t / Tau_i)]

	The code will then solve for the best fit using the SVD approach.  Subsequent to that
	the LM solver will be used for the sign control solution (if not already enforced).
	The user will be presented the opportunity (as in PRONYSEQ) to change the initial
	guess if convergence is not as good as it could be.

	The initial guess is given by a, b as:

		TMin = 2 * Pi / Freq_max
		Comp_I = [X' (TMin) ^ 2 + X" (TMin) ^ 2] ^ 1/2
		TMax = 2 * Pi / Freq_min
		Comp_L = [X' (TMax) ^ 2 + X" (TMax) ^ 2] ^ 1/2
		X0 = b * Comp_L
		X_i = Sign_GJ * (a * Comp_I - b * Comp_L) / (N - 1)

	Hence, at time 0 we get a * CompI, while at infinity we get b * CompL.

	This function draws upon the function Dynam, which describes both X' and X" as:

					c_i = Freq * Tau_i

	Freq >= 0	Dynam = X0 + Sign_GJ * [(Sum i = 1 to N-1) of X_i * c_i^2 / (1 + c_i^2)]

	Freq < 0		Dynam = (Sum i = 1 to N-1) of X_i * c_i / (1 + c_i^2)

	Hence, when the passed frequency (Freq) is negative, the value of E" (-Freq) is
	calculated, and when it is positive, the value of E' (Freq) is calculated.  It is
	simply a construction to make the resulting solution easier.  One important fact -
	there can be no E" evaluation at Freq = 0 - any such point must be eliminated.

	The resulting Prony parameters are written to the file #.XPR, and contain:

		Tau_i		X_i_SVD		RMS_SVD		X_i_LM		RMS_LM

	Two additional files are created.  The first is #.XTF, which contains a prediction of
	the function X in the time domain between the times which this code feels are
	appropriate (set by data Frequency_max and Frequency_min).  Use of the Prony series
	beyond the times contained in #.XTF is suspect, as no data existed out there to be
	fit.  This is done for both the SVD and LM solution and contains:

		Time	X_SVD		X_LM

	The other file is #.XFF, which contains a prediction of the frequency domain response
	of the function X.  The freqeuncy points are evenly spaced between the data Freq_Min
	and Freq_Max.  This is done for both the SVD and LM solution and contains:

		Freq		X'_SVD	X"_SVD	X'_LM		X"_LM

	For both of these files, the number of points was specified by the user.

*************************************************************************************/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <curses.h>
#include <math.h>
#include "./utils/baseutil.h"
#include "./utils/base_io.h"
#include "./utils/gen_util.h"
#include "./utils/solvers.h"
#include "./utils/vesolver.h"

#define FileType1 "X_T"
#define FileType2P "XP"
#define FileType2PP "XPP"
#define PronyParamExt "XPR"
#define TimeDomainFitExt "XTF"
#define FreqDomainFitExt "XFF"
#define M_PI        3.14159265358979323846
#define Message_Length 1000	// Length of message character vector

/******************************  Platform Dependent **********************************/

#define platform 1				// Enter 1 for PC or 2 for Mac

#if platform == 1					// Allow command line project name passing
	#define main_arg int argc, char* argv[]
#else									// Do not allow since Mac
	#define main_arg void
#endif

#define intL long int						// Use only long integers
#define CLEAR_SCREEN clear_screen ()	// Function to clear console
#define GET_ONE_CH getch()					// Function to get one character only from stdin
#define Proj_Name_Length 240				// Maximum project name length (8 for DOS systems)

#pragma warning (disable : 4244)			// Disable double to long conversion warning

/****************** Main body of DYNAMFIT code ****************************************/

int main (int argc, char *argv[])
{
	intL i, j, NumPts, nvar, *avar, CompMod, NumElems, NumPred;
	intL sign_run, FileType, NumPtsP, NumPtsPP, Sign, conv_check, std_dev_form;
	double *XPD, *XPPD, *FPD, *FPPD, *XNoNeed;
	
	double *std_dev, *a, *aSVD, *p, gamma1, gamma2, chisq, i_chisq, **covar, *dydt_temp;
	double *basis, *CoeffTau, imult, lmult, Freq_Min, Freq_Max, Weight, tmp, value;
	double *Tau, *Coeff, XPred1, XPred2, Tau_Min, Tau_Max, RMS, compi, compl, RMS_Sign;
	double *Freq, *XDyn, tPred, FreqPred, FreqVal, FreqRead, Wt_XP, Wt_XPP, SignGJ;
	char *project, *message, *header, *names;
	FILE *stream;

//	CLEAR_SCREEN;
//	printf ("\n\n");

// Get the project name

	project = chvector (0, Proj_Name_Length);		// Declare char vectors for solution
	//project = main_arg[0];
	names = chvector (0, Proj_Name_Length+4);		// Declare char vectors for solution
	message = chvector (0, Message_Length);
	header = chvector (0, Message_Length);

	if (platform == 1) {									// Could have command line project name
		startup_project_name (project, argv);
	} else {													// No command line project name allowed
////////////////////////////// change 1, also change base_io.c function get_project
//		get_project (project); 
		get_project(argv[1]);
		printf ("\n");
	}

// Find out data file type
///////////////////////////// change 2
//	FileType = get_int_value ("\nType (1) Input File: Single File With Each Line = Freq "
//									  " X'  X\" (#."FileType1"\nType (2) Input Files: Two Files "
//									  "With Each Line = Freq  X'/X\" (#."FileType2P"/#."
//									  FileType2PP"\n\nEnter the type of file you are providing (1 "
//									  "or 2): ", "Value must be either 1 or 2 - correct", 1, 2);

	FileType = 1;


// Get the weighting factor and set special cases (no X' or no X")
/////////////////////////// change 3
//	Weight = get_dbl_value ("Factor For Weighting X' and X\" Data:\n\n"
//									  "                  0.0 Means Consider Only X\" Data\n"
//									  "                  2.0 Means Consider Only X' Data\n"
//									  "                  1.0 Means Weight Evenly X' and X\"\n"
//									  "                  All Other Values Represent Uneven "
//									  "Weighting\n\nEnter the weighting parameter you wish to use: ",
//									  "Value must be between 0 and 2 - correct", 0., 2., 0);
	double dval = atof(argv[2]);
	Weight = dval;

/***************************************************************************************
	Case 1: Reading from single file #.X_T
***************************************************************************************/

	if (FileType == 1) {
		NumPtsP = read_XY_data (&FPD, &XPD, &XPPD, project, FileType1, 5, 0, header);
		NumPtsPP = NumPtsP;
		printf ("File %s.%s --> %5d X' And X\" Data Point Pairs\n", project, FileType1, NumPtsP);
	}

/***************************************************************************************
	Case 2: Reading from files #.XP and #.XPP
***************************************************************************************/

	else {
		NumPtsP = 0;							// Assume no points in either set to start
		NumPtsPP = 0;
		
		if (Weight != 0.)	{					// Need to read X' data since not 0
			NumPtsP = read_XY_data (&FPD, &XPD, &XNoNeed, project, FileType2P, 0, 0, header);
			printf ("File %s.%s --> %5d X' Data Points\n", project, FileType2P);
		}

		if (Weight != 2.)	{					// Need to read X" data since not 2
			NumPtsPP = read_XY_data (&FPPD, &XPPD, &XNoNeed, project, FileType2PP, 0, 0, header);
			printf ("File %s.%s --> %5d X\" Data Points\n", project, FileType2PP);
		}	
	}

/***************************************************************************************
	Create the single data vector
***************************************************************************************/
	
	NumPts = NumPtsP + NumPtsPP;
	Freq = dvector (0, NumPts);				// Use 1 to many points for X0 fix if only X"
	XDyn = dvector (0, NumPts);
	std_dev = dvector (0, NumPts);

	if (NumPtsP > 0) {
		for (i = 0 ; i < NumPtsP ; i++) {
			Freq [i] = fabs (FPD [i]);						// Ensure that this is positive
			XDyn [i] = XPD [i];
		}
	}

	if (NumPtsPP > 0) {
		for (i = 0 ; i < NumPtsPP ; i++) {
			if (FileType == 1)								// Same as XP frequency
				FreqVal = fabs (FPD [i]);				
			else													// Different value
				FreqVal = fabs (FPPD [i]);

			if (FreqVal == 0.)								// Cannot define a point X"(0)
				nrerror ("Damping data point X\" at frequency 0 is not allowed - correct");

			Freq [NumPtsP + i] = -FreqVal;				// Ensures that this is negative
			XDyn [NumPtsP + i] = XPPD [i];
		}
	}

/***************************************************************************************
	Create the standard deviation vector
***************************************************************************************/
/////////////////////////// change 4
//	std_dev_form = get_int_value ("\nStandard deviation: use the data point values (1) or "
//										 "unity (2): ", "Need to specify either 1 or 2 - "
//										 "correct", 1, 2);
	std_dev_form = argv[3];

	if (std_dev_form == 1) {
		for (i = 0 ; i < NumPts ; i++)
			std_dev [i] = XDyn [i];
	}
	else {
		for (i = 0 ; i < NumPts ; i++)
			std_dev [i] = 1.;
	}

/***************************************************************************************
	Scale the standard deviation vector to match the desired weighting
	Wt_XP - scale factor for X' (smaller is less important)
***************************************************************************************/
	
	Wt_XP = Weight;				// Standard deviation of X prime data divided by this weight
	
	if (Weight < 0.000001) {
		Wt_XP = 0.000001;
	}

	if (Weight > 1.999999) {
		Wt_XP = 1.999999;
	}

	Wt_XP = Wt_XP / 2.;
	Wt_XPP = 1. - Wt_XP;
	
	if (NumPtsP > 0) {
		for (i = 0 ; i < NumPtsP ; i++) {
			std_dev [i] = std_dev [i] / Wt_XP;
		}
	}

	if (NumPtsPP > 0) {
		for (i = 0 ; i < NumPtsPP ; i++) {
			std_dev [NumPtsP + i] = std_dev [NumPtsP + i];
		}
	}

/***************************************************************************************
	Set dummy point for special case of only X" data
	If this is not done, the unknown parameter X0 cannot be determined
***************************************************************************************/
	
	if (Weight == 0.) {		// Neglect X' data - set dummy point to find bogus X0
		printf ("Since neglecting X' data, setting X0 to 1 (arbitrary)\n");
		Freq [NumPts] = 0.;
		XDyn [NumPts] = 1.;
		std_dev [NumPts] = 1.;
		NumPts++;
	}

/***************************************************************************************
	Data obtained - now get remaining information from user
***************************************************************************************/
/////////////////////////// change 5
//	printf ("Enter the number of elements to use:                        ");
//	scanf ("%ld", &NumElems);
	NumElems = argv[4];
	if (NumElems > 104)
		NumElems = 104;
	if (NumElems < 2)
		nrerror ("\nMust use at least two or more elements - correct\n");

/////////////////////////// change 6
//	printf ("Enter the value Gamma1 (recommend 5):                       ");
//	scanf ("%lf", &gamma1);
	gamma1 = 5;
	if (gamma1 > 10.)
		nrerror ("\nValues of gamma1 larger than 10 lead to unstable results - correct\n");

/////////////////////////// change 7
//	printf ("Enter the value Gamma2 (recommend 5):                       ");
//	scanf ("%lf", &gamma2);
	gamma2 = 5;
	if (gamma2 > 10.)
		nrerror ("\nValues of gamma2 larger than 10 lead to unstable results - correct\n");

/////////////////////////// change 8
//	printf ("Enter (1) to perform sign control, (2) to not:              ");
//	scanf ("%ld", &sign_run);
	sign_run = 2;
	if (sign_run != 2)
		sign_run = 1;

/////////////////////////// change 9
//	printf ("Enter (1) for compliance, (2) for modulus:                  ");
//	scanf ("%ld", &CompMod);
	CompMod = argv[5];
	if (CompMod != 2) {
		SignGJ = -1.;
		CompMod = 1;
	}
	else
		SignGJ = 1.;

/////////////////////////// change 10
//	printf ("Enter the number of predictive points (recommend 500):      ");
//	scanf ("%ld", &NumPred);
	NumPred = 500;
	if (NumPred < 10)
		nrerror ("\nUse at least 10 predictive points - correct\n");

// Declare remaining vectors that are needed

	Tau = dvector (0, NumElems-1);
	Coeff = dvector (0, NumElems-1);
	CoeffTau = dvector (0, 2 * NumElems);
	basis = dvector (0, NumElems-1);
	a = dvector (0, 2 * NumElems + 2);
	aSVD = dvector (0, 2 * NumElems + 2);
	avar = ivector (0, 2 * NumElems + 2);
	p = dvector (0, 4);
	dydt_temp = dvector (0, 2 * NumElems + 2);
	covar = dmatrix (0, 2 * NumElems + 2, 0, 2 * NumElems + 2);

/***************************************************************************************
	Perform SVD solution - best results but without sign control
***************************************************************************************/

// First, set Tau_Min and Tau_Max for relaxation time limits

	Freq_Min = pow (10., 50.);								// Set to something really big
	Freq_Max = 0.;												// Set to 0
	for (i = 0 ; i < NumPts ; i++) {						// Find Freq_Min and Freq_Max
		FreqRead = fabs (Freq [i]);						// Current step frequency (abs)
		if (FreqRead < Freq_Min && FreqRead != 0.)
			Freq_Min = FreqRead;                      // New Freq_Min (don't count 0)
		if (FreqRead > Freq_Max)
			Freq_Max = FreqRead;                      // New Freq_Max
	}
	Tau_Min = 2. * M_PI / (Freq_Max * gamma1);
	Tau_Max = 2. * M_PI * gamma2 / Freq_Min;

// Use SVD routine to find best Prony series for given data set
// Note: signs are not controlled at all in SVD solution

	Coeff [0] = SignGJ; 	// Pass to SVD solver in this manner
	printf ("\nFind Prony series without sign control: ");
	Create_Dynamic_SVD (NumPts, Freq, XDyn, std_dev, NumElems, Tau_Min, Tau_Max,
							  Coeff, Tau, &RMS);

// Now, check if sign control is already established by SVD soln - if Sign comes out
// on the other side as 0, signs are already controlled

	Sign = 0;
	for (i = 0 ; i < NumElems ; i++)
		if (Coeff [i] < 0.)
			Sign++;

// Check if the user wanted to perform a sign control run - if not, inform user if the
// signs are not in control.  Set Sign so that sign control run is skipped if desired

	if (sign_run == 2) {  // Means skip the sign control run
		if (Sign != 0)
			printf("\nCoefficients have wrong signs - sign control run skipped by user\n");
		else
			printf ("\nSVD Prony series already enforces sign control\n");
		Sign = 0;
	}

// Set up solution vector for LM solver.  This will be used even if sign control
// solution is not performed (used for printout)

	a [0] = NumElems + 0.001;
	nvar = NumElems;
	for (i = 0 ; i < NumElems ; i++) {
		if (Sign == 0)		// If Sign != 0, a guess is provided below
			a [1 + i] = Coeff [i];
		a [NumElems + 1 + i] = Tau [i];
		avar [i] = 1 + i;
	}
	if (SignGJ < 0.)
		a [2 * NumElems + 1] = -M_PI * 1000000.;	// Use odd constant for print_results
	else
		a [2 * NumElems + 1] = M_PI * 1000000.;   // Use odd constant for print_results
	a [2 * NumElems + 2] = fabs (Freq [0]);
	RMS_Sign = RMS;

// The next section performs sign control solution using LM solver

	if (Sign != 0) {	// Need to perform sign control solution

		imult = 0.8;	// LM initial guess parameters - can be modified by user
		lmult = 4.;

		do {  // This do loop allows user to pick different initial guesses if desired

			conv_check = 0;

// Moving average approach does not do a good job - instead simply make a reasonable
//	guess at the coefficients.  Calculate the values of X' and X" at Freq_Min and
// Freq_Max.  Combine these to find the magnitude of X_Min and X_Max and use those
// as initial guesses.  Set the constant value to lmult * X_Max, and evenly distribute
// the remainder so that the time 0 result is enforced to be a * X_Min

			for (i = 0 ; i < NumElems ; i++) {
				CoeffTau [i] = Coeff [i];
				CoeffTau [NumElems + i] = Tau [i];
			}
			CoeffTau [2 * NumElems] = SignGJ;

// First, place (X' at Freq_Min)^2 into compl

			Dynam_Basis (Freq_Min, basis, CoeffTau, NumElems);
			compl = Coeff [0];
			for (i = 1 ; i < NumElems ; i++)
				compl += Coeff [i] * basis [i];
			compl *= compl;

// Second, place (X" at Freq_Min)^2 into tmp

			Dynam_Basis (-Freq_Min, basis, CoeffTau, NumElems);
			tmp = 0.;
			for (i = 1 ; i < NumElems ; i++)
				tmp += Coeff [i] * basis [i];
			tmp *= tmp;

// Combine and take square root to get estimate of compl

			compl = sqrt (compl + tmp);

// Third, place (X' at Freq_Max)^2 into compi

			Dynam_Basis (Freq_Max, basis, CoeffTau, NumElems);
			compi = Coeff [0];
			for (i = 1 ; i < NumElems ; i++)
				compi += Coeff [i] * basis [i];
			compi *= compi;

// Finally, place (X" at Freq_Max)^2 into tmp

			Dynam_Basis (-Freq_Max, basis, CoeffTau, NumElems);
			tmp = 0.;
			for (i = 1 ; i < NumElems ; i++)
				tmp += Coeff [i] * basis [i];
			tmp *= tmp;

// Combine and take square root to get estimate of compi

			compi = sqrt (compi + tmp);

// Scale appropriately

			compi *= imult;
			compl *= lmult;

// Distribute coefficients into a for use by LM solver when we allow for sign control

			a [1] = compl;
			for (i = 1 ; i < NumElems ; i++)
				a [1 + i] = SignGJ * (compi - a [1]) / (NumElems - 1);

// Now solve for best coefficients given best shift rate with sign control

			p [0] = -1.;			   // This tells it to use these params not sdefaults
			p [1] = 100.001;			// Allow to run a long time before loosening tolerance
			p [2] = 0.0005;			// ConvR: Convergence ratio which is acceptable
			p [3] = 1.;					// Standard deviation percentage used (for RMS)
			p [4] = 1.;					// Use RMS convergence criterion

			printf ("\nXI =%11.4E (a =%11.4E), XL =%11.4E (b =%11.4E)\n",
					  compi / imult, imult, compl / lmult, lmult);
			printf ("XI is behavior at max frequency, XL is behavior at min frequency\n");
			printf ("Use as a*XI and b*XL as initial guess for finding"
					  " sign controlled Prony series\n\n");
			sprintf (message, "X At t=0 %%12.5E  RMS %%12.5E   ");
			Levenberg (Freq, XDyn, std_dev, NumPts, a, 2 * NumElems + 3, avar, nvar, 
						  &chisq, &i_chisq, Prony_Dynam, message, p);
			RMS_Sign = 100. * sqrt (chisq / NumPts);

			compl = a [1];
			for (i = 1 ; i < NumElems ; i++)	 			// Solve for coeff sum - destroys
				compl += a [i + 1];                    // value of compl but not needed
			compl /= imult;
			tmp = fabs (log (fabs (compl / compi)));  // Within 0.75 of t[0] value?

// Lets look at whether this is adequately converged - if not, give the user a chance to
// pick some different guess values and repeat the process or accept them as is

			if (compl < 0. || fabs (RMS_Sign / RMS - 1.) > 0.2 || tmp > 0.2877) {
				printf ("\nTry and improve the convergence above with a"
						  " different initial guess a, b?\nEnter 1 for Yes and 0 for No: ");
				scanf ("%ld", &conv_check);
				if (conv_check != 1)
					conv_check = 0;
				else {
					printf ("\nEnter new initial point multiplier a: ");
					scanf ("%lf", &imult);
					printf ("Enter new final point multiplier b:   ");
					scanf ("%lf", &lmult);
					if (imult == 0. || lmult == 0.)
               	nrerror ("\nMultiplier values (a, b) must be nonzero\n");
				}
			}
		} while (conv_check != 0);
	}

// Now we have two predictions - one with and one without sign control
// First write the two Prony series to file

	sprintf (names, "%s."PronyParamExt, project);
	printf ("\nWriting Prony series coefficients for SVD"
			  " and sign control to %s\n", names);
	stream = fopen (names, "w");
	for (i = 0 ; i < NumElems ; i++)
		fprintf (stream,"%16.8E  %16.8E  %16.8E  %16.8E  %16.8E\n", Tau [i],
					Coeff [i], RMS, a [1+i], RMS_Sign);
	fclose (stream);

// Now lets create two predictions - first, for the time domain response for NumPred
// points evenly spaced between Tau_Min * gamma1 and Tau_Max / gamma2.
// First, copy SVD results into aSVD for use by Prony_Dynam

	aSVD [0] = NumElems + 0.001;
	for (i = 0 ; i < NumElems ; i++) {
		aSVD [1 + i] = Coeff [i];
		aSVD [NumElems + 1 + i] = Tau [i];
	}
	aSVD [2 * NumElems + 1] = SignGJ;
	aSVD [2 * NumElems + 2] = fabs (Freq [0]);

// Evaluate SVD and LM results in time domain and write to file for easy plotting

	sprintf (names, "%s."TimeDomainFitExt, project);
	printf ("\nWriting time domain predictions for SVD/LM solutions to %s\n", names);
	stream = fopen (names, "w");
	value = log10 (Tau_Max / gamma2) - log10 (Tau_Min * gamma1);
	for (i = 0 ; i < NumPred ; i++) {
	  tPred = pow (10., log10 (Tau_Min * gamma1) + value * i / (NumPred - 1));
	  XPred1 = aSVD [1];
	  XPred2 = a [1];
	  for (j = 1 ; j < NumElems ; j++) {
		  XPred1 += SignGJ * aSVD [1 + j] * exp (- tPred / aSVD [1 + NumElems + j]);
		  XPred2 += SignGJ * a [1 + j] * exp (- tPred / a [1 + NumElems + j]);
	  }
	  fprintf (stream,"%16.8E  %16.8E  %16.8E\n", tPred, XPred1, XPred2);
	}
	fclose (stream);

// Evaluate SVD and LM results in frequency domain and write to file for easy plotting

	sprintf (names, "%s."FreqDomainFitExt, project);
	printf ("Writing frequency domain predictions for SVD/LM solutions to %s\n",names);
	stream = fopen (names, "w");
	value = log10 (Freq_Max) - log10 (Freq_Min);

	for (i = 0 ; i < NumPred ; i++) {
	  FreqPred = pow (10., log10 (Freq_Min) + value * i / (NumPred - 1));
	  aSVD [2 * NumElems + 2] = -1. * fabs (aSVD [2 * NumElems + 2]);  // No sign control
	  Prony_Dynam (FreqPred, aSVD, &XPred1, dydt_temp);  	// Calc SVD prediction - X'
	  Prony_Dynam (-FreqPred, aSVD, &XPred2, dydt_temp);  // Calc SVD prediction - X"
	  fprintf (stream,"%16.8E  %16.8E  %16.8E", FreqPred, XPred1, XPred2);
	  Prony_Dynam (FreqPred, a, &XPred1, dydt_temp);  		// Calc LM prediction - X'
	  Prony_Dynam (-FreqPred, a, &XPred2, dydt_temp);  	// Calc LM prediction - X"
	  fprintf (stream,"%16.8E  %16.8E\n", XPred1, XPred2);
	}
	fclose (stream);

	printf ("\nHit a key to exit to system ");
	getch ();

	return 0;
}																				  // End Of Routine [main]

