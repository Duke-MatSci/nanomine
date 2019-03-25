/*************************************************************************************

	SOLVERS.C

	This file contains numerical routines for solving basic mathematicl problems.  Many
	of these routines are modified from Numerical Recipes For C, although there has
	been significant modification.  This file needs to be included in all Northwestern
	Physical Aging Codes that rely on Levenberg-Marquadt solvers or other matrix
	equation solvers.  These codes have been extended to only use intL as integer
	declarations.  This in general should be long integers - this change should be
	reflected in all future codes to avoid upper counter limits.

	Roger Bradshaw
	Northwestern University
	First Written: 16 September 1996
	Individual Codes Written As Listed

*************************************************************************************/

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
#include <curses.h>
//#include <conio.h>
#include "solvers.h"
#include "baseutil.h"
#include "base_io.h"

#define intL long int

#define M_PI	3.14159265358979323846
#pragma warning ( disable : 4244)  // Disable double to long conversion warning

#define local_max(a,b) (a > b ? a : b)
#define local_min(a,b) (a < b ? a : b)
/*************************************************************************************

	LEVENBERG: Levenberg-Marquardt Solver Routine

	Originally from Numerical Recipes For C.  Severely modified to use doubles and take
	advantage of convergence routine (using the #defines below).  This routine uses two
	functions: mrqmin (main) and mrqcof (second routine called by mrqmin).

	Brief Description Of Variables Passed
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	x			Double vector containing data point x values

	y			Double vector containing data point y values

	sig		Double vector containing data point standard deviation values

	ndata		Integer number of data points

	a			Double vector of fitting model coefficients - initialized with guesses

	ma			intL containing total number of fitting model coefficients

	lista		intL vector containing list of model coeffs to be fit by this routine

	nvar		intL containing number of terms in lista

	f_chisq  Final value of chi square error with returned parameters

	i_chisq	Initial value of chi square error using passed (initial guess) parameters

	*funcs	Function containing fitting model.  Its parameters will be x, pointer to
				y (x), pointer to a, pointer to dyda.  It will evaluate y(x) as well as
				the first derivatives dy/da at x.

	message	Character vector which will be used to print intermediate results.  See
				Print_Results for more information.  Set to "NoPrint" to have no
				intermediate output.

	param		Double vector containing parameters for fitting algorithm.  These are:

		param [0]	If 0., use default parameters.
						If -1., set params using list
						Otherwise, fail since there is likely an error in the calling data

		param [1]	ConvL - Iteration limit for parameter shifting

		param [2]	ConvR - Ratio Limit for parameter shifting

		param [3]	StdDevPct -	Assumes Standard Deviation is a StdDevPct * point value
										Only used to convert chi square error to RMS error

		param [4]	ConvStyle - if 0., look at parameter changes; if not 0., look at RMS

	Brief Description Of Convergence Criterion
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	The convergence criteria used in this routine was developed by Roger Bradshaw. It
	allows a number of different techniques, and tries to always allow some sort of
	convergence to be achieved.  This is done by tracking the ratio of how one
	parameter changes from one step to another.  This will either be all of
	the parameters considered one by one (ConvStyle 0) or only the RMS error between
	the data and the model (ConvStyle 1).  In every case, the difference in this
	parameter is (ParamNew - ParamOld) / ParamOld.  If it is less than ConvR, then
	convergence is assumed.  If ConvL iterations occur without convergence, ConvR is
	doubled.  This doubling will continue to occur until convergence is achieved.
	Hence, if many iterations are required, the convergence may not be good at all,
	since ConvR may be many times its initial value.

	Furthermore, the user can restrict all parameters from taking on negative values
	and taking giant leaps.  This is done by setting nvar to -nvar.  This will modify
	any parameter changes to prevent the undesired parameter value.

	History
	~~~~~~~

	Updated: 1 Nov 1995		To use new Gauss-Jordan solver

	Updated: 30 Nov 1995 	Set that for negative nvar, no parameter will be
									allowed to go negative or take a giant leap

	Updated: 20 Aug 1996		Added RMS convergence criterion as second choice

	Updated: 16 Sept 1996	Added parameter vector *param for all criteria passing

	Updated: 29 Jan 1997		Modified Print_Results call, added new stop iterating option
									(although not yet finished), more comments

	Updated: 2 Feb 1997		Eliminated use of covariant matrix

	Updated: 19 March 1997	Added RMS Limit so that convergence occurs if RMS < RMSLim

	Updated: 14 July 1997	Added ma < nvar check

*************************************************************************************/

void Levenberg (double *x, double *y, double *sig, intL ndata, double *a,
					 intL ma, intL *lista, intL nvar, double *f_chisq, double *i_chisq,
					 void (*funcs) (double, double *, double *, double *),
					 char *message, double *param)
{
	intL i, j, k, ihit, niter, stop_negative_values, ConvL, ConvStyle, early_stop;
	double *da, **alpha, *beta, chi_sq, alambda, scale, tmp1, RMS_Old, RMSLim;
	double *a_new, **alpha_new, *beta_new, new_chi_sq, RMS_Error, StdDevPct, ConvR;

// Declare DMA that will be needed

	alpha = dmatrix (0, ma - 1, 0, ma - 1);
	alpha_new = dmatrix (0, ma - 1, 0, ma - 1);
	a_new = dvector (0, ma - 1);
	beta = dvector (0, ma - 1);
	beta_new = dvector (0, ma - 1);
	da = dvector (0, ma - 1);

// Initialize parameters needed for solution

	if (param [0] == 0.) {  // In this case, use the defaults
		ConvL = 20;
		ConvR = 0.0005;
		StdDevPct = 0.02;
		ConvStyle = 0;
	}

	else {
		if (param [0] == -1.) {
			ConvL = param [1];
			ConvR = param [2];
			StdDevPct = param [3];
			if (param [4] == 1.) {
				ConvStyle = 1;
				RMSLim = pow (10., -6.);	// Do not iterate once RMS gets less than this
			}
			else
				ConvStyle = 0;
		}
		else
			nrerror ("\nError in param [0] call to LM solver - correct to be 0 or -1\n");
	}

// Check if the user wants negative values and giant jumps prohibited
// If so, nvar will be negative, and the sign needs to be changed

	if (nvar < 0) {
		nvar *= -1;
		stop_negative_values = 1;
	}
	else
		stop_negative_values = 0;

// Check that the list of variable parameters is acceptable

	if (ma < nvar)
		nrerror ("\nNumber of varying parameters nvar less than total number ma in "
					"L-M Solver\n");

	i = nvar;						  // Place into i the total number of varying parameters

	for (j = 0 ; j < ma ; j++) { // This section completes LISTA with fixed terms
		ihit = 0;

		for (k = 0 ; k < nvar ; k++)
			if (lista [k]  == j) ihit++;

		if (ihit == 0)
			lista [i++] = j;

		else if (ihit > 1)
			nrerror ("\nSame Variable Described Twice As Varying In L-M Solver avar\n");
	}

	if (i != ma)
		nrerror ("\nUnacceptable Varying Parameter List avar In L-M Solver\n");

// Past this point means that avar, nvar, and lista are acceptable for solution

	scale = 1.;  // This will be used with the convergence criteria
	niter = 0;   // As will this

// Initialize values of alpha, beta, chi_sq, lambda

	mrqcof (x, y, sig, ndata, a, ma, lista, nvar, alpha, beta, &chi_sq, funcs);

	*i_chisq = chi_sq;  	// Save initial value of chi_sq
	RMS_Error =  100. * StdDevPct * sqrt (chi_sq / ndata);
	RMS_Old = RMS_Error;
	if (strcmp (message, "NoPrint") != 0)
		print_results (message, a, lista, nvar, RMS_Error, -10000);

	alambda = 0.001;  // Initialize lambda

// The following do loops repeats until convergence occurs or the user requests the
// iterations to stop and return the current value as best.  At the beginning of the
// do loop, updated values for alpha, beta, chi_sq, a are all known

	do {

// Check if the user is satisfied with our current value for a.  If this is the case,
// the value returned will be 1.  If 1, exit from the do loop, as if converged.

		early_stop = User_Requests_Stop ();
		if (early_stop == 1)
			break;

		for (i = 0 ; i < nvar ; i++) { 				// Update new alpha term for solution
			for (j = 0 ; j < nvar ; j++)
				alpha_new [i][j] = alpha [i][j];

			alpha_new [i][i] += alambda * alpha [i][i];
		}

		Gauss_Jordan (nvar, alpha_new, da, beta);		// Solve for da = alpha^-1 * beta

		for (i = 0 ; i < ma ; i++)
			a_new [i] = a [i];

		for (i = 0 ; i < nvar ; i++) {  // Create a_new = a + da
			if (stop_negative_values == 1) {
				if (da [i] < -0.75 * a_new [lista [i]])
					a_new [lista [i]] /= 2.;  // Prevent negative values
				else {
					if (da [i] > 2. * a_new [lista [i]])
						a_new [lista [i]] *= 2.;  // Prevent giant jumps
					else
						a_new [lista [i]] += da [i];
				}
			}
			else
				a_new [lista [i]] += da [i];
		}

		mrqcof (x, y, sig, ndata, a_new, ma, lista, nvar, alpha_new, beta_new,
				  &new_chi_sq, funcs);  // Use a_new to get new alpha, beta, chi_sq

		if (new_chi_sq > chi_sq) { // If this, bad step so increase lambda and return.
			alambda *= 10.;         // Note that alpha, beta, chi_sq, a have not changed
		}                          // so simply go to top of do loop with new lambda

		else {  // The step gave us a better answer

			chi_sq = new_chi_sq;  // Update chi_sq since this is our new answer
			RMS_Error = 100. * StdDevPct * sqrt (chi_sq / ndata);

			for (i = 0 ; i < nvar ; i++)  // Update alpha since this is our new answer
				for (j = 0 ; j < nvar ; j++)
					alpha [i][j] = alpha_new [i][j];

// Now consider if we have converged.  See top notes for how this works.

			niter++;  // The number of iterations

			if (niter % ConvL == 0)
				scale *= 2.;

			ihit = 0;

			if (ConvStyle == 0) {
				for (i = 0 ; i < nvar ; i++) { // If var changes little increase ihit
					tmp1 = (a_new [lista [i]] - a [lista [i]]) / a [lista [i]];
					if (fabs (tmp1) < scale * ConvR) ihit++;
				}
			}

			if (ConvStyle == 1) {
				tmp1 = (RMS_Error - RMS_Old) / RMS_Old;
				if (fabs (tmp1) < scale * ConvR)
					ihit = nvar;
				else if (fabs (RMS_Error) < RMSLim)		// Stop iterating if this good
					ihit = nvar;
			}

			if (ihit == nvar) { // If ihit increased nvar times, all vars are converged
				for (i = 0 ; i < ma ; i++)
					a [i] = a_new [i];  // Update a since this is our new answer

				alambda = 0.;  // Now we have final versions of a, chi_sq
									// so return by setting alambda = 0.
			}

			else {  // If here, we are still not converged so update and repeat
				alambda /= 10.;  // Decrease lambda

				for (i = 0 ; i < ma ; i++)
					a [i] = a_new [i];  // Update a since this is our new answer

				for (i = 0 ; i < nvar ; i++)
					beta [i] = beta_new [i];  // Update beta since this is our new answer

				RMS_Old =  100. * StdDevPct * sqrt (chi_sq / ndata);
			}
		}

		RMS_Error =  100. * StdDevPct * sqrt (chi_sq / ndata);
		if (strcmp (message, "NoPrint") != 0)
			print_results (message, a, lista, nvar, RMS_Error, niter);

	} while (alambda != 0.);

// Once we have passed out of the above loop, we have convergence with a good solution
// or the user wanted to stop.  The goodness of fit is contained in covariant matrix
// which is the inverse of alpha - calculation of covar was eliminated since never used.
// The updated parameters are in a.  Lets save the final value of chi_sq in f_chisq

	*f_chisq = chi_sq;
	RMS_Error =  100. * StdDevPct * sqrt (chi_sq / ndata);
	if (strcmp (message, "NoPrint") != 0) {
		if (niter > 0)
			print_results (message, a, lista, nvar, RMS_Error, -niter);
		else
			print_results (message, a, lista, nvar, RMS_Error, -1);
	}

// Pass number of iterations back via param [0] (negative if user requested stop)

	if (early_stop == 1)
		param [0] = -niter - 0.001;
	else
		param [0] = niter + 0.001;

// Done so free DMA and return

	free_dvector (da, 0);
	free_dvector (a_new, 0);
	free_dmatrix (alpha, 0, ma - 1, 0);
	free_dmatrix (alpha_new, 0, ma - 1, 0);
	free_dvector (beta, 0);
	free_dvector (beta_new, 0);

	return;
}																							// End Of Levenberg


/*************************************************************************************

	MRQCOF: Calculation of Curvature Matrix and Others for Levenberg-Marquadt method

	This routine will return the matrices alpha, beta, and the value of chi square at
	this point.  Little changed from original Numerical Recipes For C routines.

*************************************************************************************/

void mrqcof (double *x, double *y, double *sig, intL ndata, double *a, intL ma,
				 intL *lista, intL nvar, double **alpha, double *beta, double *chisq,
				 void (*funcs) (double, double *, double *, double *))
{
	intL i, j, k;
	double yfit, wt, sig2i, dy, *dyda;

	dyda = dvector (0, ma - 1);	 // Will contain derivatives wrt varying params
	for (j = 0 ; j < nvar ; j++) { // nvar is the number of varying params
		for (k = 0 ; k <= j ; k++)  // Only do the lower half and complete at end
			alpha [j] [k] = 0.;
		beta [j] = 0.;
	}

	*chisq = 0.0;  // Initialize chi square

	for (i = 0 ; i < ndata ; i++) {

		yfit = i + 0.001;  // Pass iteration to solver (generally not used)

		(*funcs) (x [i], a, &yfit, dyda);  // Get values for point x [i]

		sig2i = 1. / (sig [i] * sig[i]);
		dy = y [i] - yfit;

		for (j = 0 ; j < nvar ; j++) {
			wt = dyda [lista [j]] * sig2i;
			beta[j] += dy * wt;

			for (k = 0 ; k <= j ; k++)   // Only do the lower half and complete at end
				alpha [j] [k] += wt * dyda [lista [k]];
		}

		*chisq += dy * dy * sig2i;
	}

	for (j = 1 ; j < nvar ; j++)  // Copy symmetric terms to both sides
		for (k = 0 ; k < j ; k++)
			alpha [k] [j] = alpha [j] [k];

// Now alpha, beta, chi square are updated - free DMA and return

	free_dvector (dyda, 0);

	return;
}																								// End Of mrqcof


/***************************************************************************************

	USER_REQUESTS_STOP: Checks if this is so for Levenberg-Marquardt solution

	This routine polls the keyboard to see if the user wants to stop or not (by hitting
	the F10 key).  At present this routine is still not very good since it leaves the hit
	key to get here on the scanned line. If stop is requested, return 1; otherwise,
	return 0.

***************************************************************************************/

#include <stdio.h>
#include <termios.h>
#include <unistd.h>
#include <fcntl.h>

int kbhit(void)
{
	struct termios oldt, newt;
	int ch;
	int oldf;

	tcgetattr(STDIN_FILENO, &oldt);
	newt = oldt;
	newt.c_lflag &= ~(ICANON | ECHO);
	tcsetattr(STDIN_FILENO, TCSANOW, &newt);
	oldf = fcntl(STDIN_FILENO, F_GETFL, 0);
	fcntl(STDIN_FILENO, F_SETFL, oldf | O_NONBLOCK);

	ch = getchar();

	tcsetattr(STDIN_FILENO, TCSANOW, &oldt);
	fcntl(STDIN_FILENO, F_SETFL, oldf);

	if(ch != EOF)
	{
		ungetc(ch, stdin);
		return 1;
	}

	return 0;
}

int User_Requests_Stop (void) {
	int stop_val = 0;

	if (kbhit () != 0) {
		if (getch () == 0)			// Did they hit a special key?
			if (getch () == 68)		// Was that key F10
				stop_val = 2 - get_int_value ("\nSatisfied with current solution (1) or"
							" continue iterating (2): ", "Please enter either 1 or 2", 1, 2);
	}

	return stop_val;
}																			   // End Of User_Requests_Stop


/*************************************************************************************

	LM_SUBSET: Levenberg-Marquardt Solver Routine Using Subset Presolution

	The arguments for this routine are the same as those for LEVENBERG.  This routine
	works with the local variable subset.  The goal of this routine is to first get a
	reasonable solution using a subset of the total number of points, followed by a full
	solution which is returned to the user.

	The number of points in the subset is equal to subset * nvar (the number of varying
	parameters); these subset points are evenly spaced amongst the original data set.
	The subset solution is undertaken only if the number of subset points is less than
	ndata / subset (ie in cases when ndata / subset^2 > nvar)

	Note that subset can take on any value desired, but it must be greater than or equal
	to 1 to provide a solution (singularity occurs otherwise as nvar > ndata_subset)

	SUBSET / PRINTOUT User Settings
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	The user can modify the variables i_chisq and f_chisq (which are output values from
	this routine) upon input to determine subset and printing settings.

	At start:  i_chisq    f_chisq    means
				  ~~~~~~~    ~~~~~~~    ~~~~~
					 -1.         N       Use N subset points, subset summary printout
					 -2.         N       Use N subset points, intermediate subset printouts
					 -3.       Varies    Subset pts determined, intermediate subset printouts
					Other      Varies    Subset pts determined, subset summary printout

	The subset summary printout only prints the initial and final error result of the
	subset solution phase.  The intermediate subset printout shows the same information
	that will be obtained from the full LM solver solution.

	NOTE: If message is passed as "NoPrint" there will be no intermediate or summary
		   printouts during either the subset or full solution

	Roger Bradshaw, Northwestern University
	Code Completed: 15 Feb 1997
	Code Updated: 15 July 1997		To allow intermediate subset solution prints

*************************************************************************************/

void LM_Subset (double *x, double *y, double *sig, intL ndata, double *a,
					 intL ma, intL *lista, intL nvar, double *f_chisq, double *i_chisq,
					 void (*funcs) (double, double *, double *, double *),
					 char *message, double *param)
{
	intL i, j, sub_n, sign_nvar, print_type;
	double *sub_x, *sub_y, *sub_sig, subset, step_val, tmp;
	char message_sub [80];

	subset = 5.;											// This value may be changed as desired

	sign_nvar = 1;											// Allow for negative nvar
	if (nvar < 0) {
		nvar *= -1;
		sign_nvar = -1;
	}

	if (*i_chisq != -1. && *i_chisq != -2.)      // Number of subset points determined
		sub_n = nvar * subset;
	else                                         // Number of subset points user spec.
		sub_n = *f_chisq;

	if (*i_chisq != -2. && *i_chisq != -3.) {    // Use only summary subset printouts
		print_type = 0;
		sprintf (message_sub, "NoPrint");         // Send NoPrint to subset solver
	}
	else {                                       // Use intermediate subset printouts
		print_type = 1;
		strcpy (message_sub, message);            // Send original to subset solver
	}

	if (sub_n<ndata/subset || *i_chisq==-1.) { 	// Use subset presolution in this case
		sub_x = dvector (0, sub_n - 1);				// Subset x, y, sigma
		sub_y = dvector (0, sub_n - 1);
		sub_sig = dvector (0, sub_n - 1);

		step_val = (ndata - 2.) / (sub_n - 1.); 	// Use -2 to ensure inside data set
		for (i = 0 ; i < sub_n ; i++) {
			j = i * step_val;
			sub_x [i] = x [j];
			sub_y [i] = y [j];
			sub_sig [i] = sig [j];
		}

		if (strcmp (message, "NoPrint") != 0)	// Only print if to print for full part
			printf ("Performing Subset Presolution Using %d Points of Full Set (%d)\n",
					  sub_n, ndata);

		tmp = param [0];
		Levenberg (sub_x, sub_y, sub_sig, sub_n, a, ma, lista, sign_nvar * nvar, f_chisq,
					  i_chisq, funcs, message_sub, param);

		if (strcmp (message, "NoPrint") != 0) {	// Only print if to print for full part
			if (print_type == 0) 						// Summary printout
				printf ("RMS %% Error: Initial %12.4E, Subset %12.4E, Iterations %d\n",
						  100. * param [3] * sqrt (*i_chisq / sub_n),
						  100. * param [3] * sqrt (*f_chisq / sub_n), (intL) param [0]);
			else
				printf ("\nPerforming Full Solution Case\n");		// Insert separation line
		}

		param [0] = tmp;
	}

// Now ready to complete full solution requested by user with guess in a

	Levenberg (x, y, sig, ndata, a, ma, lista, sign_nvar * nvar, f_chisq, i_chisq,
				  funcs, message, param);

	return;
}


/*************************************************************************************

	PRINT_RESULTS: Used by Levenberg to print initial, intermediate, and final results

	This routine takes in a message line with the appropriate output vector and prints
	the results to the screen.  If step is -10000, the word "Init" is addended.  If step
	is larger than 0, the words "It ###" are addended as the step number.  If step is
	less than 0 but not -10000, the word "F(###)" is addended, where ### is the final
	number of iterations required for solution (sent in as -step).

	What is outputted is dependent on the message.  A typical message should contain
	as its first 4 characters:

		message = "@XX@" + "Normal Message Text"

	where XX is a number between 00 and 99 which says which output case to use.  If
	the first character of message is not @, the first nvar terms are outputted directly
	to message.  In the case that nvar is greater than 5 and the first character is not
	@, the code will use the old approach (assuming a Prony series of some sort).

	The string message should not contain any "/" characters.

*************************************************************************************/

void print_results (char *message, double *out, intL *la, intL nvar,
						  double crit, intL step)
{
	intL i, NumElems, Use_Code = 0, Code_Val, num, b, c, *iptr, PP;
	double coeff_sum, sign;
	char *m_ptr, message_copy [80];

// This first line deals with messages of the form "@XX@"+"text" and leaves
// m_ptr pointing at the beginning of the text with Code_Val containing the integer XX

	if (message [0] == 64) {
		if (message [3] != 64)
			nrerror ("\nFor Print_Results, Print Code Must Be @##@ - Correct\n");
		Use_Code = 1;
		strcpy (message_copy, message);
		m_ptr = strtok (message_copy, "@");
		Code_Val = atoi (m_ptr);
		m_ptr = strtok (NULL, "@");
	}

/***************************************************************************************
	Old Approach - From Routines Prior To 01/29/97 Which Have Not Been Updated Yet
***************************************************************************************/

	if (Use_Code == 0) {	// Old Method

		if (nvar == 1)
			printf (message, out [la[0]], crit);

		if (nvar == 2)
			printf (message, out [la[0]], out [la[1]], crit);

		if (nvar == 3)
			printf (message, out [la[0]], out [la[1]], out [la[2]], crit);

		if (nvar == 4)
			printf (message, out [la[0]], out [la[1]], out [la[2]], out [la[3]], crit);

		if (nvar == 5)
			printf (message, out [la[0]], out [la[1]], out [la[2]], out [la[3]],
					  out [la[4]], crit);

		if (nvar > 5) {  // Prony series
			NumElems = out [0];
			coeff_sum = out [1];

// Odd sign structure necessitated by different approaches.  PRONYSEQ has compliance
// coefficients that are negative, so simply add them up.  DYNAMFIT has compliance
// coefficients that are positive, so they need to be multiplied by -1 and added up.
// In out [2 * NumElems + 1], PRONYSEQ has either 0, t[0], or -t[0].  In DYNAMFIT,
// out [2 * NumElems + 1] contains either M_PI * 1000000. or -M_PI * 1000000.  This
// routine looks for the case when it equals -M_PI * 1000000.  Only in the unlikely
// case that -t[0] is -M_PI * 1000000. does this routine have troubles.

			sign = 1.;
			if (out [2 * NumElems + 1] == - M_PI * 1000000.)
				sign = -1.;
			for (i = 1 ; i < NumElems ; i++)
				coeff_sum += sign * out [i + 1];
			if (nvar == NumElems)	// Aging (if exists) is not varying so don't print
				printf (message, coeff_sum, crit);
			else							// Considering aging so print mu as well
				printf (message, coeff_sum, out [2 * NumElems + 2], crit);
		}
	}

/***************************************************************************************
	Case 00 - Used By Routine "Fit_Prony_Eta_Compliance" (VESOLVER)
***************************************************************************************/

	if (Use_Code == 1 && Code_Val == 0) {
		NumElems = out [0];
		coeff_sum = out [5];
		for (i = 1 ; i < NumElems ; i++)
			coeff_sum += out [5 + i];
		printf (m_ptr, coeff_sum, crit);
	}

/***************************************************************************************
	Case 01 - Used By Routine "Create_Prony_Sign" (VESOLVER) to report compliance/modulus
***************************************************************************************/

	if (Use_Code == 1 && Code_Val == 1) {
		NumElems = out [0];
		coeff_sum = out [1];
		for (i = 1 ; i < NumElems ; i++)
			coeff_sum += out [1 + i];
		printf (m_ptr, out [1], coeff_sum, crit);
	}

/***************************************************************************************
	Case 02 - Used By Routine "fit_Kohlrausch" in CSF_REF to S0, Tau, Beta, Mu
***************************************************************************************/

	if (Use_Code == 1 && Code_Val == 2) {
		num = out [2];												// Convert to int
		num = 3 + 3 * num;
		printf (m_ptr, out [num], out [num + 1], out [num + 2], out [num + 4], crit);
	}

/***************************************************************************************
	Case 03 - Used By Routine "fit_Prony" in CSF_REF to plot 0 and Infinity values, Mu
***************************************************************************************/

	if (Use_Code == 1 && Code_Val == 3) {
		num = out [2];												// Convert to NumSteps to int
		b = 3 + 3 * num;
		NumElems = out [b];
		coeff_sum = out [b + 1];
		for (i = 1 ; i < NumElems ; i++)
			coeff_sum += out [b + 1 + i];
		c = b + 2 * NumElems + 1;
		printf (m_ptr, out [b + 1], coeff_sum, out [c], crit);
	}

/***************************************************************************************
	Case 04 - Used By Program CSF_ATE During Effective Time Solution (Kohlrausch ref)
***************************************************************************************/

	if (Use_Code == 1 && Code_Val == 4) {
		b = out [2];                                    // Convert to NumSteps to int
		c = 3 + 3 * b + 4;										// Points to eff time solution
		NumElems = out [c];
		coeff_sum = out [c + 2];
		for (i = 1 ; i < NumElems ; i++)
			coeff_sum += out [c + 2 + i];
		printf (m_ptr, out [c + 2], coeff_sum, crit);
	}

/***************************************************************************************
	Case 05 - Used By Program CSF_ATE During Effective Time Solution (Prony ref)
***************************************************************************************/

	if (Use_Code == 1 && Code_Val == 5) {
		b = out [2];                                    // Convert to NumSteps to int
		c = 3 + 3 * b;												// Points to Prony start
		b = out [c];												// Prony number of elements
		c += 1 + 2 * b;											// Points to effective time soln
		NumElems = out [c];
		coeff_sum = out [c + 2];
		for (i = 1 ; i < NumElems ; i++)
			coeff_sum += out [c + 2 + i];
		printf (m_ptr, out [c + 2], coeff_sum, crit);
	}

/***************************************************************************************
	Case 06 - Used By Program KAHR_Data_Fit During Parameter Solution
***************************************************************************************/

	if (Use_Code == 1 && Code_Val == 6) {
		iptr = dbl_to_int_vector_ptr (out [33]);			// Vector containing print terms
		PP = abs (iptr [0]);										// Number of terms to printout
		switch (PP) {
			case 1:
				printf (m_ptr, out [iptr [1]], crit);
				break;

			case 2:
				printf (m_ptr, out [iptr [1]], out [iptr [2]], crit);
				break;

			case 3:
				printf (m_ptr, out [iptr [1]], out [iptr [2]], out [iptr [3]], crit);
				break;

			case 4:
				printf (m_ptr, out [iptr [1]], out [iptr [2]], out [iptr [3]],
						  out [iptr [4]], crit);
				break;

			default:
				nrerror ("\nNumber of printout terms too large in Print_Results Case 6\n");
		}
	}

/***************************************************************************************
	No more cases so addend current step status and exit
***************************************************************************************/

	if (step >= 0)
		printf ("It %d\r", step);

	else {
		if (step == -10000)
			printf ("Init\n");
		else
			printf ("F(%d)\n", -step);
	}

	return;
} 																					  // End Of Print_Results


/*************************************************************************************

	CALC_BAND_INVERSE: Inverts a banded matrix using Gaussian elimination / exact methods

	The known matrix is a (size x size), and it is banded about the diagonal with
	bandwidth band.  Exact solutions are used for 3x3 matrices or smaller.

	NOTE: I have found that for large matrices, roundoff errors can play a significant
	role in returning not good results.  Beware!  This should be improved by using
	pivoting, but has not been accounted for yet.

*************************************************************************************/

void calc_band_inverse (double **a, double **inv, intL band, intL size)
{
	int i, j, k;
	double **b, temp, delta;

	if (size == 1) {
		inv [0][0] = 1. / a [0][0];
	}

	if (size == 2) {
		delta = 1. / (a [0][0] * a [1][1] - a [0][1] * a [1][0]);
		inv [0][0] = delta * a [1][1];
		inv [0][1] = - delta * a [0][1];
		inv [1][0] = - delta * a [1][0];
		inv [1][1] = delta * a [0][0];
	}

	if (size == 3) {
		delta =  a [0][0] * a [1][1] * a [2][2];
		delta += a [1][0] * a [0][2] * a [2][1];
		delta += a [0][1] * a [2][0] * a [1][2];
		delta -= a [0][0] * a [1][2] * a [2][1];
		delta -= a [1][1] * a [0][2] * a [2][0];
		delta -= a [2][2] * a [1][0] * a [0][1];
		delta = 1. / delta;

		inv [0][0] = delta * (a [1][1] * a [2][2] - a [1][2] * a [2][1]);
		inv [0][1] = delta * (a [0][2] * a [2][1] - a [0][1] * a [2][2]);
		inv [0][2] = delta * (a [0][1] * a [1][2] - a [0][2] * a [1][1]);

		inv [1][0] = delta * (a [1][2] * a [2][0] - a [1][0] * a [2][2]);
		inv [1][1] = delta * (a [0][0] * a [2][2] - a [0][2] * a [2][0]);
		inv [1][2] = delta * (a [0][2] * a [1][0] - a [0][0] * a [1][2]);

		inv [2][0] = delta * (a [1][0] * a [2][1] - a [1][1] * a [2][0]);
		inv [2][1] = delta * (a [0][1] * a [2][0] - a [0][0] * a [2][1]);
		inv [2][2] = delta * (a [0][0] * a [1][1] - a [0][1] * a [1][0]);
	}

	if (size > 3) {

// Allocate memory for b

		b = dmatrix (0, size - 1, 0, size - 1);

// Copy given matrix to b so given is not damaged by this inversion

		for (i = 0 ; i <= size - 1 ; i ++) {
			for (j = 0 ; j <= size - 1 ; j ++) {
				b [i] [j] = a [i] [j];
				if (i == j)
					inv [i] [j] = 1.0;
				else
					inv [i] [j] = 0.0;
			}
		}

// First eliminate the lower half of the matrix
// Step over number of active rows

		for (i = 0 ; i <= size - 1 ; i++) {

// Step 1 - Make current row have unity on the diagonal

			temp = b [i] [i];

			for (j = i ; j <= local_min (i + band - 1 , size - 1) ; j++)
				b [i] [j] /= temp;
			for (j = 0 ; j <= i ; j++)
				inv [i] [j] /= temp;

// Step 2 - There are a maximum of (band - 1) clearings to be done

			for (j = i + 1 ; j <= local_min (i + band - 1 , size - 1) ; j++) {
				temp = b [j] [i];

				for (k = i ; k <= local_min (i + band - 1 , size - 1) ; k++)
					b [j] [k] -= temp * b [i] [k];
				for (k = 0 ; k <= i ; k++)
					inv [j] [k] -= temp * inv [i] [k];
			}
		}

// Now matrix has only upper triangular terms - clear those out
// No need to make changes to b matrix - only get info from it

		for (i = size - 1 ; i >= 1 ; i--) {
			for (j = i - 1 ; j >= local_max(i - band + 1, 0) ; j--) {
				temp = b [j] [i];
				for (k = 0 ; k <= size - 1 ; k++)
					inv [j] [k] -= temp * inv [i] [k];
			}
		}

		free_dmatrix (b, 0, size - 1, 0);
	}

	return;
} 																				 // End Of calc_band_inverse


/*************************************************************************************

	GAUSS_JORDAN: Gauss-Jordan Linear Equation Solver With Back Substitution And Pivoting

	Written By: Roger Bradshaw, Northwestern University
					Completed: 30 Oct 95

	This routine solves the matrix-vector equation A_ij * x_j = b_i for x given A, b
	Send in the order of the problem (N), the known NxN matrix (A), the given Nx1
	solution vector (b), and an Nx1 vector to place the final answer in (x).  This
	routine in not destructive to A_Orig or b_Orig

*************************************************************************************/

void Gauss_Jordan (intL N, double **A_Orig, double *x, double *b_Orig)
{
	intL i, j, k, *ind, count;
	double **A, *b, value;
	char message [80];

	ind = ivector (0, N-1);				// Index vector for pivoting
	A = dmatrix (0, N-1, 0, N-1);		// Copy of A_Orig for working
	b = dvector (0, N-1);				// Copy of b_Orig for working

// Initialize all terms

	for (i = 0 ; i < N ; i++) {
		ind [i] = i;
		b [i] = b_Orig [i];
		for (j = 0 ; j < N ; j++)
			A [i][j] = A_Orig [i][j];
	}

// All operations will be performed on the pivoted matrices (if this term is not
// understood, see Numerical Recipes For C for an explanation).  This will be done
// by using the index vector (ind) for each element rather than the actual term.
// Hence, the term A_i,j will be referred to by A_ind [i],j.  Note that only the rows
// need to pivoted, so j can be as it normally is.

	for (i = 0 ; i < N ; i++) {      // Loop over all rows, doing Gaussian elimination

// First, find the largest pivot term, and swap rows with the current ith row

		value = 0.;
		count = 0;
		if (A [ind [i]][i] == 0.) {
			sprintf (message, "\nMatrix Is Singular In Gauss-Jordan Solver Routine"
									" At Row %d\n", i+1);
			nrerror (message);
		}

		for (j = i ; j < N ; j++) {
			if (fabs (A [ind [j]][i]) > value) {
				value = fabs (A [ind [j]][i]);
				count = j;
			}
		}
		k = ind [i];
		ind [i] = ind [count];
		ind [count] = k;

// Now the ith row is the pivot row.  Divide that row by the pivot amount, and
// eliminate all terms below it

		value = A [ind [i]][i];       // Reduce pivot row to 1 on the diagonal
		for (j = i ; j < N ; j++)
			A [ind [i]][j] /= value;
		b [ind [i]] /= value;

		if (i != N-1) {  					// Need not do if last row
			for (j = i+1 ; j < N ; j++) {
				value = A [ind [j]][i];
				for (k = i ; k < N ; k++)
					A [ind [j]][k] -= value * A [ind [i]][k];
				b [ind [j]] -= value * b [ind [i]];
			}
		}
	}

// Now the matrix has zeros on all terms below the diagonal.  Backsubstitute to find
// the result for x.

	x [N-1] = b [ind [N-1]] / A [ind [N-1]][N-1];  			// First solution special

	for (i = N-2 ; i >= 0 ; i--) {  								// Solve for remaining terms
		x [i] = b [ind [i]];
		for (j = i+1 ; j < N ; j++)
			x [i] -= A [ind [i]][j] * x [j];
		x [i] /= A [ind [i]][i];
	}

// Completed so release DMA and return

	free_ivector (ind, 0);
	free_dmatrix (A, 0, N-1, 0);
	free_dvector (b, 0);

	return;
} 																					   // End Of Gauss_Jordan


/***************************************************************************************

	SVDFIT: Singular Value Decomposition Least Squares Fit Routine

	Written By: Roger Bradshaw, Northwestern University
	Completed: 	November 1, 1996

	This routine takes in a set of data given by X, Y, StdDev consisting of ndata points.
	Also passed is the function containing the method of evaluating the basis functions.
	There are ma basis functions, the coefficients of which will be returned in a.  Upon
	completion, chisq will contain the chi square error.	This routine is originally from
	Numerical Recipes For C and has been only slightly modified.

	To make the transition easier for NumRecC, all SVD matrices reference off of 1.

	Modified: 3 March 1997	Can now disable printing by passing chisq = -1. initially

***************************************************************************************/

#define TOL 1.E-12

void svdfit (double *x, double *y, double *sig, intL ndata, double *a, intL ma,
				 double *chisq, void (*funcs)(double, double *, double *, intL))
{
	intL i, j, type = 0;
	double wmax, tmp, thresh, sum, *b, *afunc, **u, **v, *w, *af;

	if (*chisq == -1.)
		type = 1;

	b = dvector (1, ndata);				// Declare DMA
	af = dvector (1, ndata);
	afunc = dvector (0, ma-1);
	u = dmatrix (1, ndata, 1, ma);
	v = dmatrix (1, ma, 1, ma);
	w = dvector (1, ma);

	if (type == 0)
		printf ("Building Matrix At Point      ");
	for (i = 0 ; i < ndata ; i++) {		// Establish A (place in u) and b for SVD
		if (type == 0)
			printf ("\b\b\b\b\b%5d",i+1);
		(*funcs) (x [i], afunc, a, ma);
		tmp = 1. / sig [i];
		for (j = 0 ; j < ma ; j++)
			u [i+1][j+1] = afunc [j] * tmp;
		b [i+1] = y [i] * tmp;
	}

	if (type == 0)
		printf ("...Decomposing");
	svdcmp (u, ndata, ma, w, v);			// Complete SVD of u - return u, v, w
	if (type == 0)
		printf ("...Solving...");

	wmax = 0.;                          // Find biggest term in w
	for (j = 0 ; j < ma ; j++)
		if (w [j+1] > wmax)
			wmax = w [j+1];

	thresh = TOL * wmax;						// Zero those terms that are smaller than this
	for (j = 0 ; j < ma ; j++)
		if (w [j+1] < thresh)
			w [j+1] = 0.;

	svbksb (u, w, v, ndata, ma, b, af);	// Back substitute to find answer for af

	for (i = 0 ; i < ma ; i++)				// Reference back to 0
		a [i] = af [i+1];

	*chisq = 0.;								// Evaluate chi square using determined a
	for (i = 0 ; i < ndata ; i++) {
		(*funcs) (x [i], afunc, a, ma);
		sum = 0.;
		for (j = 0 ; j < ma ; j++)
			sum += a [j] * afunc[j];
		tmp = (y [i] - sum) / sig[i];
		*chisq += tmp * tmp;
	}

	free_dvector (afunc, 0);				// Free up memory
	free_dvector (b, 1);
	free_dvector (af, 1);
	free_dmatrix (u, 1, ndata, 1);
	free_dmatrix (v, 1, ma, 1);
	free_dvector (w, 1);

	return;
} 																					  			// End Of svdfit

#undef TOL


/***************************************************************************************

	SVDCMP: Singular Value Decomposition Routine

	Written By: Roger Bradshaw, Northwestern University
	Completed: 	November 1, 1996

	This routine takes in a matrix u which is size m x n, and performs SVD on it,
	returning u, v, w.  The routine indexes off of one, so all passed and returned
	matrices must be indexed as such.  This routine is originally from Numerical Recipes
	For C and has been only slightly modified to use doubles.

***************************************************************************************/

static double at, bt, ct;

#define PYTHAG(a,b) ((at=fabs(a)) > (bt=fabs(b)) ? \
(ct=bt/at,at*sqrt(1.0+ct*ct)) : (bt ? (ct=at/bt,bt*sqrt(1.0+ct*ct)): 0.0))

static double maxarg1, maxarg2;

#define MAX(a,b) (maxarg1=(a),maxarg2=(b),(maxarg1) > (maxarg2) ?\
	(maxarg1) : (maxarg2))

#define SIGN(a,b) ((b) >= 0.0 ? fabs(a) : -fabs(a))

#define NIterMax 100

void svdcmp (double **a, intL m, intL n, double *w, double **v)
{
	intL flag,i,its,j,jj,k,l,nm;
	double c,f,h,s,x,y,z;
	double anorm=0.0,g=0.0,scale=0.0;
	double *rv1;

	if (m < n) nrerror("\nSVDCMP: You must augment A with extra zero rows\n");
	rv1=dvector(1,n);
	for (i=1;i<=n;i++) {
		l=i+1;
		rv1[i]=scale*g;
		g=s=scale=0.0;
		if (i <= m) {
			for (k=i;k<=m;k++) scale += fabs(a[k][i]);
			if (scale) {
				for (k=i;k<=m;k++) {
					a[k][i] /= scale;
					s += a[k][i]*a[k][i];
				}
				f=a[i][i];
				g = -SIGN(sqrt(s),f);
				h=f*g-s;
				a[i][i]=f-g;
				if (i != n) {
					for (j=l;j<=n;j++) {
						for (s=0.0,k=i;k<=m;k++) s += a[k][i]*a[k][j];
						f=s/h;
						for (k=i;k<=m;k++) a[k][j] += f*a[k][i];
					}
				}
				for (k=i;k<=m;k++) a[k][i] *= scale;
			}
		}
		w[i]=scale*g;
		g=s=scale=0.0;
		if (i <= m && i != n) {
			for (k=l;k<=n;k++) scale += fabs(a[i][k]);
			if (scale) {
				for (k=l;k<=n;k++) {
					a[i][k] /= scale;
					s += a[i][k]*a[i][k];
				}
				f=a[i][l];
				g = -SIGN(sqrt(s),f);
				h=f*g-s;
				a[i][l]=f-g;
				for (k=l;k<=n;k++) rv1[k]=a[i][k]/h;
				if (i != m) {
					for (j=l;j<=m;j++) {
						for (s=0.0,k=l;k<=n;k++) s += a[j][k]*a[i][k];
						for (k=l;k<=n;k++) a[j][k] += s*rv1[k];
					}
				}
				for (k=l;k<=n;k++) a[i][k] *= scale;
			}
		}
		anorm=MAX(anorm,(fabs(w[i])+fabs(rv1[i])));
	}
	for (i=n;i>=1;i--) {
		if (i < n) {
			if (g) {
				for (j=l;j<=n;j++)
					v[j][i]=(a[i][j]/a[i][l])/g;
				for (j=l;j<=n;j++) {
					for (s=0.0,k=l;k<=n;k++) s += a[i][k]*v[k][j];
					for (k=l;k<=n;k++) v[k][j] += s*v[k][i];
				}
			}
			for (j=l;j<=n;j++) v[i][j]=v[j][i]=0.0;
		}
		v[i][i]=1.0;
		g=rv1[i];
		l=i;
	}
	for (i=n;i>=1;i--) {
		l=i+1;
		g=w[i];
		if (i < n)
			for (j=l;j<=n;j++) a[i][j]=0.0;
		if (g) {
			g=1.0/g;
			if (i != n) {
				for (j=l;j<=n;j++) {
					for (s=0.0,k=l;k<=m;k++) s += a[k][i]*a[k][j];
					f=(s/a[i][i])*g;
					for (k=i;k<=m;k++) a[k][j] += f*a[k][i];
				}
			}
			for (j=i;j<=m;j++) a[j][i] *= g;
		} else {
			for (j=i;j<=m;j++) a[j][i]=0.0;
		}
		++a[i][i];
	}
	for (k=n;k>=1;k--) {
		for (its=1;its<=NIterMax;its++) {
			flag=1;
			for (l=k;l>=1;l--) {
				nm=l-1;
				if (fabs(rv1[l])+anorm == anorm) {
					flag=0;
					break;
				}
				if (fabs(w[nm])+anorm == anorm) break;
			}
			if (flag) {
//				c=0.0;  // Seems unnecessary so comment out until sure
				s=1.0;
				for (i=l;i<=k;i++) {
					f=s*rv1[i];
					if (fabs(f)+anorm != anorm) {
						g=w[i];
						h=PYTHAG(f,g);
						w[i]=h;
						h=1.0/h;
						c=g*h;
						s=(-f*h);
						for (j=1;j<=m;j++) {
							y=a[j][nm];
							z=a[j][i];
							a[j][nm]=y*c+z*s;
							a[j][i]=z*c-y*s;
						}
					}
				}
			}
			z=w[k];
			if (l == k) {
				if (z < 0.0) {
					w[k] = -z;
					for (j=1;j<=n;j++) v[j][k]=(-v[j][k]);
				}
				break;
			}
			if (its == NIterMax) nrerror("\nNo convergence after max SVDCMP iterations\n");
			x=w[l];
			nm=k-1;
			y=w[nm];
			g=rv1[nm];
			h=rv1[k];
			f=((y-z)*(y+z)+(g-h)*(g+h))/(2.0*h*y);
			g=PYTHAG(f,1.0);
			f=((x-z)*(x+z)+h*((y/(f+SIGN(g,f)))-h))/x;
			c=s=1.0;
			for (j=l;j<=nm;j++) {
				i=j+1;
				g=rv1[i];
				y=w[i];
				h=s*g;
				g=c*g;
				z=PYTHAG(f,h);
				rv1[j]=z;
				c=f/z;
				s=h/z;
				f=x*c+g*s;
				g=g*c-x*s;
				h=y*s;
				y=y*c;
				for (jj=1;jj<=n;jj++) {
					x=v[jj][j];
					z=v[jj][i];
					v[jj][j]=x*c+z*s;
					v[jj][i]=z*c-x*s;
				}
				z=PYTHAG(f,h);
				w[j]=z;
				if (z) {
					z=1.0/z;
					c=f*z;
					s=h*z;
				}
				f=(c*g)+(s*y);
				x=(c*y)-(s*g);
				for (jj=1;jj<=m;jj++) {
					y=a[jj][j];
					z=a[jj][i];
					a[jj][j]=y*c+z*s;
					a[jj][i]=z*c-y*s;
				}
			}
			rv1[l]=0.0;
			rv1[k]=f;
			w[k]=x;
		}
	}
	free_dvector(rv1,1);
} 																					  			// End Of svdcmp

#undef SIGN
#undef MAX
#undef PYTHAG
#undef NIterMax


/***************************************************************************************

	SVDBKSB: Singular Value Decomposition Back Substitution Routine

	Written By: Roger Bradshaw, Northwestern University
	Completed: 	November 1, 1996

	This routine takes in the decomposed matrices u, v, w and the vector b, and finds the
	appropriate x by backsubstitution.  Originally from Numerical Recipes for C code, and
	changed only to use doubles.  References off 1, so all passed and returned matrices
	must be indexed as such.

***************************************************************************************/

void svbksb(double **u, double *w, double **v, intL m, intL n, double *b, double *x)
{
	intL jj,j,i;
	double s,*tmp;

	tmp=dvector(1,n);
	for (j=1;j<=n;j++) {
		s=0.0;
		if (w[j]) {
			for (i=1;i<=m;i++) s += u[i][j]*b[i];
			s /= w[j];
		}
		tmp[j]=s;
	}
	for (j=1;j<=n;j++) {
		s=0.0;
		for (jj=1;jj<=n;jj++) s += v[j][jj]*tmp[jj];
		x[j]=s;
	}
	free_dvector(tmp,1);
} 																					  		  // End Of svdbksb


/***************************************************************************************

	RTSAFE: "Safe" version of root-finding Newton-Raphson method for a 1-D equation

	It is passed the brackets where the user believes the root in question lies (x1, x2)
	such that x1 < root < x2 and f(x1) * f (x2) < 0.  It returns the found root when it
	is located to the degree of accuracy requested, xacc.  No more than NumIter
	iterations will be taken, and if the routine fails to converge by then, the user is
	notified via nrerror.

	This code is taken from Numerical Recipes For C, and is little changed except for
	the extension to double precision and the ability to pass NumIter as a parameter.
	Also added: a parameter list which can be taken into funcd.

	funcd has parameters (x, *param, *f, *df) and it passes f(x) in *f, df/dx in *df

***************************************************************************************/

double rtsafe (void (*funcd)(double, double *, double *, double *), double *param,
					double x1, double x2, double xacc, intL NumIter)
{
	intL j;
	double df,dx,dxold,f,fh,fl;
	double swap,temp,xh,xl,rts;
	void nrerror();

	(*funcd)(x1,param,&fl,&df);
	(*funcd)(x2,param,&fh,&df);
	if (fl*fh >= 0.0) nrerror("\nRoot must be bracketed in RTSAFE\n");
	if (fl < 0.0) {
		xl=x1;
		xh=x2;
	} else {
		xh=x1;
		xl=x2;
		swap=fl;
		fl=fh;
		fh=swap;
	}
	rts=0.5*(x1+x2);
	dxold=fabs(x2-x1);
	dx=dxold;
	(*funcd)(rts,param,&f,&df);
	for (j=1;j<=NumIter;j++) {
		if ((((rts-xh)*df-f)*((rts-xl)*df-f) >= 0.0)
			|| (fabs(2.0*f) > fabs(dxold*df))) {
			dxold=dx;
			dx=0.5*(xh-xl);
			rts=xl+dx;
			if (xl == rts) return rts;
		} else {
			dxold=dx;
			dx=f/df;
			temp=rts;
			rts -= dx;
			if (temp == rts) return rts;
		}
		if (fabs(dx) < xacc) return rts;
		(*funcd)(rts,param,&f,&df);
		if (f < 0.0) {
			xl=rts;
			fl=f;
		} else {
			xh=rts;
			fh=f;
		}
	}
	nrerror("\nMaximum number of iterations exceeded in RTSAFE\n");

   return 0.;	// Never actually used but makes compiler happy...
} 																					  		   // End Of rtsafe


/***************************************************************************************

	BRENT: Brent's method of finding a function minima/maxima using parabolic interp.

	This is a routine taken from Numerical Recipes for C.  It seeks to find the minima
	or maxima of the function f(x,a), where x is the independent variable and a is the
	parameter list defining the function.  This routine has been modified to use doubles
	as well as including a function parameter list a.  Other than that, the code is as
	originally written.

	Parameters passed (described as finding minima)

	ax			Lower bracket of where you think xmin is
	bx			Some middle value inside of bracket where you think xmin is, ax < bx < cx
	cx			Upper bracket of where you think xmin is
	f(x,fa)	Function being evaluated at x using function parameters fa
	tol		Acceptable tolerance on xmin
	xmin		Value of x at which function is minimized (or maximized)
	fa			Function parameter list passed by user

	This routine finds the value xmin such that f(xmin,a) is a localized minima (or
	maxima).  The value f(xmin,a) is returned by this function.

	Pass a negative tolerance to print the current step information throughout solution.

	Roger Bradshaw, Northwestern University
	Code Completed: 1 March 1997
	Updated: 5 April 1997 to allow intermediate printout via a negative tolerance pass

***************************************************************************************/

#define ITMAX 100
#define CGOLD 0.3819660
#define ZEPS 1.0e-15
#define SIGN(a,b) ((b) > 0.0 ? fabs(a) : -fabs(a))
#define SHFT(a,b,c,d) (a)=(b);(b)=(c);(c)=(d);

double brent (double ax, double bx, double cx, double (*f) (double, double *),
				  double tol, double *xmin, double *fa)
{
	int iter, i, print_results;
	double a,b,d,etemp,fu,fv,fw,fx,p,q,r,tol1,tol2,u,v,w,x,xm;
	double e=d=0.0;	// Added d definition although never used to elim compiler warning

	print_results = 0;
	if (tol < 0.) {
		print_results = 1;
		for (i = 0 ; i < 44 ; i++)
			printf (" ");
		tol *= -1.;
	}

	a=((ax < cx) ? ax : cx);
	b=((ax > cx) ? ax : cx);
	x=w=v=bx;
	fw=fv=fx=(*f)(x,fa);
	for (iter=1;iter<=ITMAX;iter++) {
		xm=0.5*(a+b);
		if (print_results == 1) {
			for (i = 0 ; i < 44 ; i++)
				printf ("\b");
			printf ("Step %4d: Min In [%11.4E, %11.4E]", iter, a, b);
		}
		tol2=2.0*(tol1=tol*fabs(x)+ZEPS);
		if (fabs(x-xm) <= (tol2-0.5*(b-a))) {
			*xmin=x;
			return fx;
		}
		if (fabs(e) > tol1) {
			r=(x-w)*(fx-fv);
			q=(x-v)*(fx-fw);
			p=(x-v)*q-(x-w)*r;
			q=2.0*(q-r);
			if (q > 0.0) p = -p;
			q=fabs(q);
			etemp=e;
			e=d;
			if (fabs(p) >= fabs(0.5*q*etemp) || p <= q*(a-x) || p >= q*(b-x))
				d=CGOLD*(e=(x >= xm ? a-x : b-x));
			else {
				d=p/q;
				u=x+d;
				if (u-a < tol2 || b-u < tol2)
					d=SIGN(tol1,xm-x);
			}
		} else {
			d=CGOLD*(e=(x >= xm ? a-x : b-x));
		}
		u=(fabs(d) >= tol1 ? x+d : x+SIGN(tol1,d));
		fu=(*f)(u,fa);
		if (fu <= fx) {
			if (u >= x) a=x; else b=x;
			SHFT(v,w,x,u)
			SHFT(fv,fw,fx,fu)
		} else {
			if (u < x) a=u; else b=u;
			if (fu <= fw || w == x) {
				v=w;
				w=u;
				fv=fw;
				fw=fu;
			} else if (fu <= fv || v == x || v == w) {
				v=u;
				fv=fu;
			}
		}
	}
	nrerror("\nToo many iterations in BRENT minimization routine\n");
	*xmin=x;
	return fx;
}																					// End Of Routine [brent]

#undef ITMAX
#undef CGOLD
#undef ZEPS
#undef SIGN
#undef SHFT


/***************************************************************************************

	This routine executes a single step of the 5th order Runge-Kutta Cash-Karp solution
	method.  The current time value is x, the solution at the current point is y, the
	derivative of y at the current point is dydx, the step size to be taken in h, and the
	returned solution at x+h is placed in yout.  Also, the estimate of the local error
	is returned in yerr.  This routine works with a vector of y which is order n.

	The derivative dydx as a function of x and y is passed by the function derivs as

		derivs (x, *p, *y, *dydx)

	where p is a parameter list describing the function.

	Written using Numerical Recipes as source, changed variables to doubles,
	referenced solution vectors (y, dydx, yout, yerr) off 0

	Roger Bradshaw, Northwestern University
	Code Completed: 8 July 1997

***************************************************************************************/

void rkck(double *y, double *dydx, intL n, double x, double h, double *yout,
			 double *yerr, double *p, void (*derivs)(double, double *, double *, double *))
{
	intL i;

	static double 	a2=0.2,a3=0.3,a4=0.6,a5=1.0,a6=0.875,b21=0.2,
						b31=3.0/40.0,b32=9.0/40.0,b41=0.3,b42 = -0.9,b43=1.2,
						b51 = -11.0/54.0, b52=2.5,b53 = -70.0/27.0,b54=35.0/27.0,
						b61=1631.0/55296.0,b62=175.0/512.0,b63=575.0/13824.0,
						b64=44275.0/110592.0,b65=253.0/4096.0,c1=37.0/378.0,
						c3=250.0/621.0,c4=125.0/594.0,c6=512.0/1771.0, dc5 = -277.0/14336.0;

	double dc1=c1-2825.0/27648.0,dc3=c3-18575.0/48384.0,
			 dc4=c4-13525.0/55296.0,dc6=c6-0.25;

	double *ak2, *ak3, *ak4, *ak5, *ak6, *ytemp;

	ak2=dvector(0,n-1);
	ak3=dvector(0,n-1);
	ak4=dvector(0,n-1);
	ak5=dvector(0,n-1);
	ak6=dvector(0,n-1);
	ytemp=dvector(0,n-1);

	for (i=0;i<n;i++)
		ytemp[i]=y[i]+b21*h*dydx[i];
	(*derivs)(x+a2*h,p,ytemp,ak2);

	for (i=0;i<n;i++)
		ytemp[i]=y[i]+h*(b31*dydx[i]+b32*ak2[i]);
	(*derivs)(x+a3*h,p,ytemp,ak3);

	for (i=0;i<n;i++)
		ytemp[i]=y[i]+h*(b41*dydx[i]+b42*ak2[i]+b43*ak3[i]);
	(*derivs)(x+a4*h,p,ytemp,ak4);

	for (i=0;i<n;i++)
		ytemp[i]=y[i]+h*(b51*dydx[i]+b52*ak2[i]+b53*ak3[i]+b54*ak4[i]);
	(*derivs)(x+a5*h,p,ytemp,ak5);

	for (i=0;i<n;i++)
		ytemp[i]=y[i]+h*(b61*dydx[i]+b62*ak2[i]+b63*ak3[i]+b64*ak4[i]+b65*ak5[i]);
	(*derivs)(x+a6*h,p,ytemp,ak6);

	for (i=0;i<n;i++)                                           // Calculate solution
		yout[i]=y[i]+h*(c1*dydx[i]+c3*ak3[i]+c4*ak4[i]+c6*ak6[i]);

	for (i=0;i<n;i++)												 			// Calculate error
		yerr[i]=h*(dc1*dydx[i]+dc3*ak3[i]+dc4*ak4[i]+dc5*ak5[i]+dc6*ak6[i]);

	free_dvector(ytemp,0);
	free_dvector(ak6,0);
	free_dvector(ak5,0);
	free_dvector(ak4,0);
	free_dvector(ak3,0);
	free_dvector(ak2,0);

	return;
}


/***************************************************************************************

	This routine manages the adaptive step sizes using the 5th order Runge-Kutta
	Cash-Karp solution method in rkck.  Provided to the routine is the current time value
	x, the solution at the current point is y, the derivative of y at the current point
	dydx, the initial step size guess htry, the desired accuracy eps, and the error
	scaling vector yscale.

	This routine calls rkck which calculates the values at the next step and returns the
	error.  If the solution does not satisfy the error criteria, a smaller step size is
	taken using the 5th order error estimate as a guide.  The process is repeated until
	the solution satisfies the error criteria.  The actual step size taken is returned in
	hdid, and the next step size estimate is returned in hnext.

	The derivative dydx as a function of x and y is passed by the function derivs as

		derivs (x, *p, *y, *dydx)

	where p is a parameter list describing the function.

	Written using Numerical Recipes as source, changed variables to doubles,
	referenced solution vectors (y, dydx, yout, yerr) off 0

	Roger Bradshaw, Northwestern University
	Code Completed: 8 July 1997

***************************************************************************************/

#define SAFETY 0.9
#define PGROW -0.2
#define PSHRNK -0.25
#define ERRCON 1.89e-4

void rkqs (double *y, double *dydx, intL n, double *x, double htry, double eps,
			  double *yscal, double *hdid, double *hnext, double *p,
			  void (*derivs)(double, double *, double *, double *))
{
	intL i;
	double errmax,h,xnew,*yerr,*ytemp, temp;

	yerr=dvector(0,n-1);
	ytemp=dvector(0,n-1);
	h=htry;
	for (;;) {
		rkck(y,dydx,n,*x,h,ytemp,yerr,p,derivs);
		errmax=0.0;
		for (i=0;i<n;i++) {
			temp = fabs(yerr[i]/yscal[i]);
			if (errmax < temp)
				errmax = temp;
		}
		errmax /= eps;
		if (errmax > 1.0) {
			h=SAFETY*h*pow(errmax,PSHRNK);
			if (h < 0.1*h) h *= 0.1;
			xnew=(*x)+h;
			if (xnew == *x)
				nrerror("\nStepsize underflow in rkqs: obtained new step = old step\n");
			continue;
		}
		else {
			if (errmax > ERRCON) *hnext=SAFETY*h*pow(errmax,PGROW);
			else *hnext=5.0*h;
			*x += (*hdid=h);
			for (i=0;i<n;i++) y[i]=ytemp[i];
			break;
		}
	}
	free_dvector(ytemp,0);
	free_dvector(yerr,0);
}
#undef SAFETY
#undef PGROW
#undef PSHRNK
#undef ERRCON


/***************************************************************************************

	This routine performs the solution of an ODE using adaptive step size with the 5th
	order Runge-Kutta Cash-Karp solution method.  Here is what you need to pass:

	nvar			Integer, Number of y terms (ie, order of the ODE system of equations)
	kmax			Maximum number of parameters that can be returned (size of x, y)
	xp				Vector, Stored solution time values (Order kmax)
	yp				Matrix, Stored solution time values (Order [nvar][kmax])

	ystart		Vector, Containing initial y values (size nvar)
	x1				Double, Where the solution should start
	x2				Double, Where the solution should end
	h1				Initial stepsize
	hmin			Double, Minimum permitted stepsize
	dxsav			Double, Save value only time since last step is greater than this

	p				Vector, Parameter list for derivative function (Order known by derivs)
	derivs		Derivative function (x, *p, *y, *dydx)

	type			Integer, Error model (1, 2, 3) - see below
	eps			Double, Error parameter
	*nok			Integer Pointer, Number of steps that converged immediately
	*nbad			Integer Pointer, Number of steps that reqd adaptation to satisfy
	MAXSTP		Maximum number of iterations that is permitted

	The error models (type) are as follows:

	1 = Set yscale to abs(y) + TINY, eps is a percent error type criteria
	2 = Set yscale to 1, eps is an absolute error type criteria
	3 = Set yscale to abs(y) + h*abs(dydx) + TINY, eps is a percent error type criteria
	4 = Set yscale to abs(y - ystart) + h*abs(dydx) + TINY, eps is a %err type criteria

	The derivative dydx as a function of x and y is passed by the function derivs as

		derivs (x, *p, *y, *dydx)

	where p is a parameter list describing the function.

	If the value kmax is exceeded, this routine ends in error.  This routine returns
	the number of iterations actually taken (count).  The maximum number of iterations
	allowed is passed as MAXSTP.

	Upon completion, ystart is replaced with y(x2).  To not have any intermediate storage
	of solutions, set kmax to 0.  In this case, only the final solution value will be
	stored.

	Written using Numerical Recipes as source, changed variables to doubles,
	referenced solution vectors (y, dydx, yout, yerr) off 0, significant other changes

	Roger Bradshaw, Northwestern University
	Code Completed: 8 July 1997

***************************************************************************************/

#define TINY 1.0e-30

intL odeint (intL nvar, intL kmax, double *xp, double **yp, double *ystart,
				 double x1, double x2, double h1, double hmin, double dxsav,
				 double *p, void (*derivs)(double, double *, double *, double *),
				 intL type, double eps, intL *nok, intL *nbad, intL MAXSTP)
{
	intL count, nstp, i;
	double xsav, x, hnext, hdid, h;
	double *yscal, *y, *dydx;
	char message [200];

	yscal = dvector (0, nvar-1);
	y = dvector (0, nvar-1);
	dydx = dvector (0, nvar-1);

	x = x1;										// Set params
	h = h1;
	if (x2 < x1)
		h *= -1.;
	*nok = *nbad = count = -1;

	for (i = 0 ; i < nvar ; i++)			// Initialize y
		y [i] = ystart [i];

	if (kmax > 0)								// First step is definitely stored
		xsav = x - dxsav * 2.0;

	nstp = 1;

	do {                                            // Loop over steps
		(*derivs)(x,p,y,dydx);								// Calculate derivatives

		switch (type) {
			case 1:
				for (i = 0 ; i < nvar ; i++)
					yscal [i] = fabs (y[i]) + TINY;
				break;

			case 2:
				for (i = 0 ; i < nvar ; i++)
					yscal [i] = 1.;
				break;

			case 3:
				for (i = 0 ; i < nvar ; i++)
					yscal [i] = fabs (y[i]) + fabs (dydx[i]*h) + TINY;
				break;

			case 4:
				for (i = 0 ; i < nvar ; i++)
					yscal [i] = fabs (y[i] - *ystart) + fabs (dydx[i]*h) + TINY;
				break;

			default:
				nrerror ("\nError calculation model parameter in odeint must be 1 - 4\n");
				break;
		}

		if (kmax > 0) {										// Should any steps be stored?
			if (fabs (x - xsav) >= fabs (dxsav)) {		// Far enough since last storage?
				if (count < kmax-1) {                  // Too many steps yet?
					xp[++count]=x;								// Store this point and increment
					for (i = 0 ; i < nvar ; i++)
						yp[i][count] = y[i];
					xsav = x;
				}
				else
					nrerror ("\nNumber of storage points kmax exceeded limit in ODEINT\n");
			}
		}

		if ((x+h-x2)*(x+h-x1) > 0.0)		// Could this be last step? - If so limit it
			h = x2 - x;

		rkqs (y, dydx, nvar, &x, h, eps, yscal, &hdid, &hnext, p, derivs);  // Solve

		if (hdid == h)							// Increase appropriate counter
			++(*nok);
		else
			++(*nbad);

		if ((x-x2)*(x2-x1) >= 0.0)      	// If so, last step so exit do loop
			nstp = MAXSTP + 1;
		else {									// Otherwise update and repeat do loop
			if (fabs(hnext) <= hmin) {
				sprintf (message,"\nStep size requested (%14.8E) at x = %14.8E was less\n"
									  "than the minimum allowable step size (%14.8E) in ODEINT\n"
									  , hnext, x, hmin);
				nrerror(message);
			}
			h = hnext;
			nstp++;
		}
	} while (nstp < MAXSTP);

	if (nstp == MAXSTP)						// If so, too many steps
		nrerror ("\nNumber of solution points exceeded limit in ODEINT\n");

	xp[++count]=x;                      // Store last solution in x, y, ystart
	for (i = 0; i < nvar ; i++) {
		ystart [i] = y [i];
		yp [i][count] = y[i];
	}

	free_dvector (dydx, 0);
	free_dvector (y, 0);
	free_dvector (yscal, 0);

   count++;
	return count;
}

#undef TINY


/***************************************************************************************

	This routine determines the root located between x1 and x2 within the accuracy
	limit value xacc. Adopted from Numerical Recipes for C.

***************************************************************************************/

double root_bisection (double (*func)(double, double *), double x1, double x2,
							  double xacc, double *a, intL NM)
{
	intL j;
	double dx, f, fmid, xmid, rtb;

	f = (*func)(x1, a);													// Get value at x1 and x2
	fmid = (*func)(x2, a);

	if (f * fmid >= 0.0)													// If same sign no root
		nrerror("Root must be bracketed for bisection in rtbis");

	rtb = f < 0.0 ? (dx = x2-x1 , x1) : (dx = x1-x2, x2);		// Condition statement

	for (j = 1; j <= NM; j++) {										// Search for root NM times
		fmid = (*func)(xmid = rtb + (dx *= 0.5), a);
		if (fmid <= 0.0) rtb = xmid;
		if (fabs (dx) < xacc || fmid == 0.0)
			return rtb;
	}

	nrerror("Too many bisections in rtbis");						// Failed to solve
	return 0.;
}


/***************************************************************************************

	This routine determines the line that best passes through a set of data. The line
	is of the form
	
		y (x) = y0 + m * (x - x0)

	The chisq error is returned as a measure of the error.

	Roger Bradshaw, University of Washington
	Code Completed: 16 Feb 1998 (verified)

***************************************************************************************/

void line_fit (intL NumPts, double *x, double *y, double x0,
					double *y0, double *m, double *chisq)
{
	intL i;
	double *std, *a;

	a = dvector (0, 2);
	a [2] = x0;

	std = dvector (0, NumPts-1);
	for (i = 0 ; i < NumPts ; i++)
		std [i] = 1.;

	*chisq = -1.;	// No intermediate output printing
	svdfit (x, y, std, NumPts, a, 2, chisq, line_basis);

	*y0 = a [0];
	*m = a [1];

	return;
}


/***************************************************************************************

	This routine evaluates a line of the form
	
		y (x) = a [0] + a [1] * (x - a [2])

	and returns the basis functions. Note that NumBasis is passed but not needed.

	Roger Bradshaw, University of Washington
	Code Completed: 16 Feb 1998 (verified)

***************************************************************************************/

void line_basis (double x, double *basis, double *a, intL NumBasis)
{
	basis [0] = 1.;
	basis [1] = x - a [2];
	return;
}																    // End Of Routine [line_function]


/*******************************  End Of SOLVERS.C  *********************************/
